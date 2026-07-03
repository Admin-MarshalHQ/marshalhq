"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  assertApplicationTransition,
  assertShiftTransition,
  canMarshalApply,
  classifyWithdraw,
  isShiftSchedulable,
} from "@/lib/state";
import { ApplySchema } from "@/lib/zod";
import { flushNotificationEmails, type NotifyParams } from "@/lib/notify";
import { datesOverlap } from "@/lib/availability";
import { formatShiftBlock } from "@/lib/format";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function applyToShiftAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const user = await requireUser();
  if (user.role !== "MARSHAL") redirect("/");

  const parsed = ApplySchema.safeParse({
    shiftId: formData.get("shiftId"),
    coverNote: formData.get("coverNote") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { shiftId, coverNote } = parsed.data;

  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return {
      error:
        "Create your marshal profile before applying. This is required so managers can assess you.",
    };
  }

  // Paused-profile backstop: a marshal whose profile has been paused by the
  // founder cannot apply. The apply form on the shift page already blocks
  // this, but a client-bypassed POST must be refused too.
  if (profile.paused) {
    return {
      error:
        "Your profile is currently paused. Contact support before applying to shifts.",
    };
  }

  // Availability backstop: a marshal who has set themselves to Not currently
  // available can't apply even if the UI is bypassed. Keeps the trust promise
  // that a posted availability means something for managers.
  if (!canMarshalApply(profile.availability)) {
    return {
      error:
        "Your availability is set to Not currently available. Update your profile availability before applying.",
    };
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  // A paused shift behaves as if it is not open — stops applications even
  // when the shift's status field is still OPEN.
  if (!shift || shift.status !== "OPEN" || shift.paused) {
    return { error: "This shift isn\u2019t open for applications." };
  }
  // Temporal guard: applying to a shift whose start has already passed would
  // create an immediately-stale application. The published-shift guard
  // prevents this happening for freshly-published shifts, but time passes
  // and an OPEN shift can drift past its start; refuse late apply attempts
  // here too rather than accept an application that will never be actioned.
  if (!isShiftSchedulable(shift)) {
    return {
      error: "This shift has already started. Applications are closed.",
    };
  }
  const acceptedOnShift = await prisma.application.count({
    where: { shiftId, status: "ACCEPTED" },
  });
  if (acceptedOnShift >= shift.marshalsNeeded) {
    return { error: "This shift is already filled." };
  }

  // Booking-conflict guard. An overlap with a shift this marshal is already
  // ACCEPTED on is a hard block: accepting both would guarantee a no-show for
  // one manager, which is the worst trust failure the loop can produce. The
  // shift detail page surfaces the same conflict before the form, but a
  // client-bypassed POST must be refused here too. Self-marked unavailable
  // dates are a soft reminder only (rendered by the page, not blocked here) —
  // the calendar is self-reported and the marshal may know better.
  const acceptedElsewhere = await prisma.application.findMany({
    where: {
      marshalId: user.id,
      status: "ACCEPTED",
      shiftId: { not: shiftId },
      shift: { status: { in: ["OPEN", "FILLED"] } },
    },
    select: {
      shift: {
        select: { startDate: true, endDate: true, productionName: true },
      },
    },
  });
  const clashingBooking = acceptedElsewhere.find((a) =>
    datesOverlap(
      shift.startDate,
      shift.endDate,
      a.shift.startDate,
      a.shift.endDate,
    ),
  );
  if (clashingBooking) {
    return {
      error: `These dates overlap ${clashingBooking.shift.productionName}, which you’re already booked on. Withdraw from that booking before applying here.`,
    };
  }

  const emailQueue: NotifyParams[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          shiftId,
          marshalId: user.id,
          coverNote: coverNote || null,
          status: "APPLIED",
        },
      });
      const whenStr = formatShiftBlock(
        shift.startDate,
        shift.endDate,
        shift.dailyStartTime,
        shift.dailyEndTime,
      );
      const pendingCount = await tx.application.count({
        where: { shiftId, status: "APPLIED" },
      });
      const applicantNote: NotifyParams = {
        userId: user.id,
        kind: "APPLICATION_SUBMITTED",
        subject: `Application submitted: ${shift.productionName}`,
        body: `You applied to ${shift.productionName} (${whenStr}, ${shift.location}). You\u2019ll be notified when the manager decides.`,
      };
      const managerNote: NotifyParams = {
        userId: shift.managerId,
        kind: "APPLICATION_SUBMITTED",
        subject: `New applicant: ${shift.productionName}`,
        body: `${profile.fullName} applied to ${shift.productionName} (${whenStr}). You now have ${pendingCount} pending applicant${pendingCount === 1 ? "" : "s"} to review on this shift.`,
      };
      await tx.notification.create({ data: applicantNote });
      await tx.notification.create({ data: managerNote });
      emailQueue.push(applicantNote, managerNote);
      return app;
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return { error: "You\u2019ve already applied to this shift." };
    }
    return { error: "Could not submit application." };
  }
  await flushNotificationEmails(emailQueue);
  revalidatePath("/marshal/applications");
  revalidatePath(`/marshal/shifts/${shiftId}`);
  redirect(`/marshal/shifts/${shiftId}?applied=1`);
}

export async function withdrawApplicationAction(applicationId: string) {
  const user = await requireUser();
  if (user.role !== "MARSHAL") redirect("/");
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { shift: true },
  });
  if (!app || app.marshalId !== user.id) redirect("/marshal");

  const flash = (reason: "committed" | "stale"): never => {
    revalidatePath(`/marshal/applications/${applicationId}`);
    redirect(`/marshal/applications/${applicationId}?withdraw=${reason}`);
  };

  // Withdrawal rules. The product centre is the trusted staffing loop; after
  // operational commitment has passed, self-service state changes damage
  // trust. COMPLETED and CLOSED shifts must never reopen through marshal
  // self-service, and ACCEPTED marshals must route through support once the
  // shift has started (the manager has already reorganised their day around
  // the booking). The classification lives in lib/state so it is pure-testable
  // and the action reads as a single switch.
  const shift = app.shift;
  const decision = classifyWithdraw(app, shift);
  if (decision !== "allowed") flash(decision);

  assertApplicationTransition(app.status, "WITHDRAWN");

  const emailQueue: NotifyParams[] = [];
  let transitionedAccepted = false;
  await prisma.$transaction(async (tx) => {
    // updateMany with the expected status re-verifies state atomically: a
    // concurrent withdraw-or-reject returns count=0 and we treat it as stale.
    const res = await tx.application.updateMany({
      where: { id: app.id, status: app.status },
      data: { status: "WITHDRAWN", decidedAt: new Date() },
    });
    if (res.count !== 1) throw new Error("WITHDRAW_STALE");

    if (app.status === "ACCEPTED") {
      // Reopen the shift only if it is still FILLED and still pinned to this
      // application. Either guard failing means another action already moved
      // the shift — don't overwrite it.
      const acceptedCount = await tx.application.count({
        where: { shiftId: app.shiftId, status: "ACCEPTED" },
      });
      const reopen = await tx.shift.updateMany({
        where: {
          id: app.shiftId,
          status: { in: ["OPEN", "FILLED"] },
        },
        data: {
          status: acceptedCount < shift.marshalsNeeded ? "OPEN" : shift.status,
        },
      });
      if (reopen.count !== 1) throw new Error("WITHDRAW_STALE");
      transitionedAccepted = true;
    }
  }).catch((err) => {
    if (err instanceof Error && err.message === "WITHDRAW_STALE") {
      flash("stale");
    }
    throw err;
  });

  if (transitionedAccepted) {
    const managerNote: NotifyParams = {
      userId: shift.managerId,
      kind: "SHIFT_STATUS_CHANGED",
      subject: `Accepted marshal withdrew: ${shift.productionName}`,
      body: `An accepted marshal dropped out. One slot has reopened on this shift.`,
    };
    await prisma.notification.create({ data: managerNote });
    emailQueue.push(managerNote);
    const priorApplicants = await prisma.application.findMany({
      where: { shiftId: shift.id, status: "APPLIED" },
      select: { marshalId: true },
    });
    for (const prior of priorApplicants) {
      const note: NotifyParams = {
        userId: prior.marshalId,
        kind: "SHIFT_STATUS_CHANGED",
        subject: `Still under consideration: ${shift.productionName}`,
        body:
          "A slot is open again on this shift. Your application is still visible to the manager; no action is needed unless you want to withdraw.",
      };
      await prisma.notification.create({ data: note });
      emailQueue.push(note);
    }
  }
  await flushNotificationEmails(emailQueue);
  revalidatePath("/marshal/applications");
  revalidatePath(`/marshal/applications/${applicationId}`);
  redirect("/marshal/applications");
}

// Thrown inside the acceptance transaction when a state guard no longer
// holds. Caught by the outer handler to flash the user back to the applicant
// page rather than surfacing a server error.
class StaleAcceptStateError extends Error {
  constructor() {
    super("STALE_ACCEPT_STATE");
  }
}

export async function acceptApplicationAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MANAGER") redirect("/login");
  const managerId = session.user.id;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { shift: true },
  });
  if (!app || app.shift.managerId !== managerId) redirect("/manager");
  const shiftId = app.shiftId;

  // Acceptance is race-safe because every state change inside the transaction
  // uses updateMany with a WHERE clause that re-asserts the current invariant
  // against the database. If two managers click Accept on different applicants
  // for the same shift at once, only one updateMany will match a row; the
  // second returns count=0 and we abort the whole transaction with a
  // StaleAcceptStateError, leaving no partial state behind. The outer redirect
  // sends the user back to the applicant page with a stale flash so they see
  // the fresh, settled state instead of a 500.
  const emailQueue: NotifyParams[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      // Re-read both sides inside the transaction so the checks are made
      // against the current DB snapshot, not the stale read above.
      const freshShift = await tx.shift.findUnique({ where: { id: shiftId } });
      const acceptedBefore = await tx.application.count({
        where: { shiftId, status: "ACCEPTED" },
      });
      if (
        !freshShift ||
        freshShift.managerId !== managerId ||
        freshShift.status !== "OPEN" ||
        freshShift.paused ||
        acceptedBefore >= freshShift.marshalsNeeded
      ) {
        throw new StaleAcceptStateError();
      }
      const freshApp = await tx.application.findUnique({
        where: { id: app.id },
      });
      if (!freshApp || freshApp.shiftId !== shiftId || freshApp.status !== "APPLIED") {
        throw new StaleAcceptStateError();
      }
      const freshProfile = await tx.marshalProfile.findUnique({
        where: { userId: freshApp.marshalId },
      });
      if (freshProfile?.paused) throw new StaleAcceptStateError();

      assertApplicationTransition(freshApp.status, "ACCEPTED");

      // Atomic acceptance of the chosen application. updateMany with the
      // APPLIED guard means a racing accept on the same application returns
      // count=0 and we bail before filling the shift.
      const acceptResult = await tx.application.updateMany({
        where: { id: app.id, status: "APPLIED" },
        data: { status: "ACCEPTED", decidedAt: new Date() },
      });
      if (acceptResult.count !== 1) throw new StaleAcceptStateError();

      const acceptedAfter = acceptedBefore + 1;
      const nextStatus =
        acceptedAfter >= freshShift.marshalsNeeded ? "FILLED" : "OPEN";
      if (nextStatus === "FILLED") {
        assertShiftTransition(freshShift.status, "FILLED");
      }

      // Fill the shift only when quota is reached. Otherwise it stays OPEN so
      // managers can keep accepting more applicants for the same hiring object.
      const fillResult = await tx.shift.updateMany({
        where: {
          id: shiftId,
          status: "OPEN",
          paused: false,
        },
        data: {
          status: nextStatus,
        },
      });
      if (fillResult.count !== 1) throw new StaleAcceptStateError();

      // Notifications. The body carries the shift facts (dates, times,
      // location) the marshal needs to put the booking in their diary without
      // opening the app \u2014 but never the manager's contact details; those are
      // released only on the application page behind the accepted-pair guard.
      const whenStr = formatShiftBlock(
        freshShift.startDate,
        freshShift.endDate,
        freshShift.dailyStartTime,
        freshShift.dailyEndTime,
      );
      const marshalUser = await tx.user.findUnique({
        where: { id: freshApp.marshalId },
        select: { phone: true },
      });
      const phoneNudge = marshalUser?.phone
        ? ""
        : " Tip: your profile has no phone number \u2014 add one, as managers expect to be able to call their booked marshal.";
      const acceptedNote: NotifyParams = {
        userId: freshApp.marshalId,
        kind: "APPLICATION_ACCEPTED",
        subject: `You\u2019re booked: ${freshShift.productionName}`,
        body: `The manager has accepted you for ${freshShift.productionName} (${whenStr}) at ${freshShift.location}. Contact details are now visible on your application page.${phoneNudge}`,
      };
      await tx.notification.create({ data: acceptedNote });
      emailQueue.push(acceptedNote);
    });
  } catch (err) {
    if (err instanceof StaleAcceptStateError) {
      revalidatePath(`/manager/shifts/${app.shiftId}/applicants/${app.id}`);
      redirect(`/manager/shifts/${app.shiftId}/applicants/${app.id}?stale=1`);
    }
    throw err;
  }
  await flushNotificationEmails(emailQueue);
  revalidatePath(`/manager/shifts/${shiftId}`);
  revalidatePath(`/manager/shifts/${shiftId}/applicants`);
  redirect(`/manager/shifts/${shiftId}/booking`);
}

export async function rejectApplicationAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MANAGER") redirect("/login");
  const managerId = session.user.id;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { shift: true },
  });
  if (!app || app.shift.managerId !== managerId) redirect("/manager");
  // Stale-session guard (see acceptApplicationAction above).
  if (app.status !== "APPLIED") {
    revalidatePath(`/manager/shifts/${app.shiftId}/applicants/${app.id}`);
    redirect(`/manager/shifts/${app.shiftId}/applicants/${app.id}?stale=1`);
  }
  assertApplicationTransition(app.status, "REJECTED");

  const emailQueue: NotifyParams[] = [];
  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: app.id },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    const rejectedNote: NotifyParams = {
      userId: app.marshalId,
      kind: "APPLICATION_REJECTED",
      subject: `Not selected: ${app.shift.productionName}`,
      body: `The manager did not select your application for ${app.shift.productionName} (${formatShiftBlock(
        app.shift.startDate,
        app.shift.endDate,
        app.shift.dailyStartTime,
        app.shift.dailyEndTime,
      )}). Your profile stays visible for other open shifts.`,
    };
    await tx.notification.create({ data: rejectedNote });
    emailQueue.push(rejectedNote);
  });
  await flushNotificationEmails(emailQueue);
  revalidatePath(`/manager/shifts/${app.shiftId}/applicants`);
  redirect(`/manager/shifts/${app.shiftId}/applicants`);
}
