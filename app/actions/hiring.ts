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
      const startStr = new Date(shift.startDate).toLocaleDateString("en-GB");
      const isBlock =
        new Date(shift.endDate).toDateString() !==
        new Date(shift.startDate).toDateString();
      const whenStr = isBlock
        ? `from ${startStr} to ${new Date(shift.endDate).toLocaleDateString("en-GB")}`
        : `on ${startStr}`;
      const applicantNote: NotifyParams = {
        userId: user.id,
        kind: "APPLICATION_SUBMITTED",
        subject: `Application submitted: ${shift.productionName}`,
        body: `You applied to ${shift.productionName} ${whenStr}. You\u2019ll be notified when the manager decides.`,
      };
      const managerNote: NotifyParams = {
        userId: shift.managerId,
        kind: "APPLICATION_SUBMITTED",
        subject: `New applicant: ${shift.productionName}`,
        body: `${profile.fullName} applied to your shift. Review the applicant in the dashboard.`,
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
      const reopen = await tx.shift.updateMany({
        where: {
          id: app.shiftId,
          status: "FILLED",
          acceptedApplicationId: app.id,
        },
        data: { status: "OPEN", acceptedApplicationId: null },
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
      body: `The accepted marshal dropped out. The shift has been reopened for applications.`,
    };
    await prisma.notification.create({ data: managerNote });
    emailQueue.push(managerNote);
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
      if (
        !freshShift ||
        freshShift.managerId !== managerId ||
        freshShift.status !== "OPEN" ||
        freshShift.paused ||
        freshShift.acceptedApplicationId !== null
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
      assertShiftTransition(freshShift.status, "FILLED");

      // Atomic acceptance of the chosen application. updateMany with the
      // APPLIED guard means a racing accept on the same application returns
      // count=0 and we bail before filling the shift.
      const acceptResult = await tx.application.updateMany({
        where: { id: app.id, status: "APPLIED" },
        data: { status: "ACCEPTED", decidedAt: new Date() },
      });
      if (acceptResult.count !== 1) throw new StaleAcceptStateError();

      // Fill the shift and pin the accepted application. The updateMany guard
      // (status=OPEN, not paused, acceptedApplicationId null) means a racing
      // accept for a different applicant on the same shift returns count=0.
      const fillResult = await tx.shift.updateMany({
        where: {
          id: shiftId,
          status: "OPEN",
          paused: false,
          acceptedApplicationId: null,
        },
        data: {
          status: "FILLED",
          acceptedApplicationId: app.id,
        },
      });
      if (fillResult.count !== 1) throw new StaleAcceptStateError();

      // Auto-reject every other APPLIED application on this shift. Re-queried
      // from inside the transaction so notifications line up with the real set.
      const others = await tx.application.findMany({
        where: {
          shiftId,
          status: "APPLIED",
          id: { not: app.id },
        },
        select: { id: true, marshalId: true },
      });
      if (others.length) {
        await tx.application.updateMany({
          where: {
            shiftId,
            status: "APPLIED",
            id: { not: app.id },
          },
          data: { status: "REJECTED", decidedAt: new Date() },
        });
      }

      // Notifications
      const acceptedNote: NotifyParams = {
        userId: freshApp.marshalId,
        kind: "APPLICATION_ACCEPTED",
        subject: `You\u2019re booked: ${freshShift.productionName}`,
        body: `The manager has accepted your application. Contact details are now visible on your application page.`,
      };
      await tx.notification.create({ data: acceptedNote });
      emailQueue.push(acceptedNote);
      for (const o of others) {
        const rejectedNote: NotifyParams = {
          userId: o.marshalId,
          kind: "APPLICATION_REJECTED",
          subject: `Not this time: ${freshShift.productionName}`,
          body: `The shift has been filled. Your application wasn\u2019t selected for this one.`,
        };
        await tx.notification.create({ data: rejectedNote });
        emailQueue.push(rejectedNote);
      }
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
      body: `The manager did not select your application for this shift.`,
    };
    await tx.notification.create({ data: rejectedNote });
    emailQueue.push(rejectedNote);
  });
  await flushNotificationEmails(emailQueue);
  revalidatePath(`/manager/shifts/${app.shiftId}/applicants`);
  redirect(`/manager/shifts/${app.shiftId}/applicants`);
}
