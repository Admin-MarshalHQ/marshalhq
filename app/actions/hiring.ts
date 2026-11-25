"use server";

import { conflictingBooking } from "@/lib/booking-conflict";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPilotAgreement } from "@/lib/pilot-agreement";
import { requireRole, requireAgreedRole } from "@/lib/access";
import {
  assertApplicationTransition,
  assertShiftTransition,
  canMarshalApply,
  classifyWithdraw,
  isShiftSchedulable,
} from "@/lib/state";
import { ApplySchema } from "@/lib/zod";
import { flushNotificationEmails, saveNotice, notifyPendingAfterDropout, type NotifyParams } from "@/lib/notify";
import { isPilotParticipant } from "@/lib/pilot-participant";
import { lockShift } from "@/lib/booking-lock";
import { formatShiftBlock } from "@/lib/format";

export async function applyToShiftAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const user = await requireAgreedRole("MARSHAL");

  const parsed = ApplySchema.safeParse({
    shiftId: formData.get("shiftId"),
    coverNote: formData.get("coverNote") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { shiftId, coverNote } = parsed.data;

  const emailQueue: string[] = [];
  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockShift(tx, shiftId);
      const [actor] = await tx.$queryRaw<{role: string}[]>`SELECT role FROM "User" WHERE id = ${user.id} AND "disabledAt" IS NULL FOR UPDATE`;
      if (actor?.role !== "MARSHAL") return { error: "Your account role changed. Sign in again." };
      await tx.$queryRaw`SELECT id FROM "MarshalProfile" WHERE "userId" = ${user.id} FOR UPDATE`;
      const profile = await tx.marshalProfile.findUnique({ where: { userId: user.id } });
      if (!profile) return { error: "Create your marshal profile before applying." };
      if (profile.paused) return { error: "Your profile is paused. Please contact support." };
      if (!canMarshalApply(profile.availability)) return { error: "Update your availability before applying." };
      const shift = await tx.shift.findUnique({ where: { id: shiftId } });
      if (!shift || shift.paused || shift.status !== "OPEN" || !isShiftSchedulable(shift)) {
        return { error: "This shift is no longer open for applications." };
      }
      if (!await hasPilotAgreement(shift.managerId, "MANAGER", tx)) return { error: "This hirer cannot currently receive applications." };
      const booked = await tx.application.count({ where: { shiftId, status: "ACCEPTED" } });
      if (booked >= shift.marshalsNeeded) return { error: "This shift is already filled." };
      const conflict = await conflictingBooking(tx, user.id, shift);
      if (conflict) return { error: `These dates overlap your booking on ${conflict.shift.productionName}.` };
      const application = await tx.application.create({
        select: { id: true },
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
        link: `/marshal/applications/${application.id}`,
        subject: `Application submitted: ${shift.productionName}`,
        body: `You applied to ${shift.productionName} (${whenStr}, ${shift.location}). You\u2019ll be notified when the manager decides.`,
      };
      const managerNote: NotifyParams = {
        userId: shift.managerId,
        kind: "APPLICATION_SUBMITTED",
        link: `/manager/shifts/${shift.id}/applicants/${application.id}`,
        subject: `New applicant: ${shift.productionName}`,
        body: `A marshal applied to ${shift.productionName} (${whenStr}). You now have ${pendingCount} pending applicant${pendingCount === 1 ? "" : "s"} to review on this shift.`,
      };
      emailQueue.push(await saveNotice(tx, applicantNote, shiftId), await saveNotice(tx, managerNote, shiftId));
      return null;
    });
    if (result) return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "SHIFT_UNAVAILABLE") return { error: "This shift is no longer open for applications." };
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
  const user = await requireRole("MARSHAL");
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

  const emailQueue: string[] = [];
  await prisma.$transaction(async (tx) => {
    await lockShift(tx, app.shiftId);
    const current = await tx.shift.findUniqueOrThrow({ where: { id: app.shiftId } });
    if (classifyWithdraw(app, current) !== "allowed") throw new Error("WITHDRAW_STALE");
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
      emailQueue.push(await saveNotice(tx, {
        userId: shift.managerId, kind: "SHIFT_STATUS_CHANGED",
        subject: `Accepted marshal withdrew: ${shift.productionName}`,
        body: "An accepted marshal withdrew. A place has reopened on your shift.",
        link: `/manager/shifts/${shift.id}`,
      }, shift.id));
      if (current.status === "FILLED") emailQueue.push(...await notifyPendingAfterDropout(tx, shift));
    }
  }).catch((err) => {
    if (err instanceof Error && err.message === "WITHDRAW_STALE") flash("stale");
    throw err;
  });
  await flushNotificationEmails(emailQueue);
  revalidatePath("/marshal/applications");
  revalidatePath(`/marshal/applications/${applicationId}`);
  redirect("/marshal/applications");
}

// Thrown inside the acceptance transaction when a state guard no longer
// holds. Caught by the outer handler to flash the user back to the applicant
// page rather than surfacing a server error.
class StaleAcceptStateError extends Error {
  constructor(reason = "STALE_ACCEPT_STATE") {
    super(reason);
  }
}

export async function acceptApplicationAction(applicationId: string) {
  const { id: managerId } = await requireAgreedRole("MANAGER");

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { shift: true },
  });
  if (!app || app.shift.managerId !== managerId) redirect("/manager");
  const shiftId = app.shiftId;

  const emailQueue: string[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      // Re-read both sides inside the transaction so the checks are made
      // against the current DB snapshot, not the stale read above.
      await lockShift(tx, shiftId);
      // A marshal may have pending applications with different managers.
      const [marshal] = await tx.$queryRaw<{ email: string }[]>`
        SELECT email FROM "User" WHERE id = ${app.marshalId} AND role = 'MARSHAL'
          AND "disabledAt" IS NULL AND "emailVerifiedAt" IS NOT NULL FOR UPDATE`;
      if (!marshal || !isPilotParticipant(marshal.email, "MARSHAL") || !await hasPilotAgreement(app.marshalId, "MARSHAL", tx)) throw new StaleAcceptStateError();
      await tx.$queryRaw`SELECT id FROM "MarshalProfile" WHERE "userId" = ${app.marshalId} FOR UPDATE`;
      const freshShift = await tx.shift.findUnique({ where: { id: shiftId } });
      const acceptedBefore = await tx.application.count({
        where: { shiftId, status: "ACCEPTED" },
      });
      if (
        !freshShift ||
        freshShift.managerId !== managerId ||
        freshShift.status !== "OPEN" ||
        freshShift.paused ||
        !isShiftSchedulable(freshShift) ||
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
      if (!freshProfile || freshProfile.paused || !canMarshalApply(freshProfile.availability)) {
        throw new StaleAcceptStateError();
      }
      const conflict = await conflictingBooking(tx, freshApp.marshalId, freshShift);
      if (conflict) throw new StaleAcceptStateError("date-conflict");

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
      emailQueue.push(await saveNotice(tx, { ...acceptedNote, link: `/marshal/applications/${app.id}` }, shiftId));
    });
  } catch (err) {
    if (err instanceof StaleAcceptStateError) {
      if (err.message === "date-conflict") redirect(`/manager/shifts/${shiftId}/applicants/${app.id}?conflict=1`);
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
  const { id: managerId } = await requireRole("MANAGER");

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

  const emailQueue: string[] = [];
  const changed = await prisma.$transaction(async (tx) => {
    await lockShift(tx, app.shiftId);
    const result = await tx.application.updateMany({
      where: { id: app.id, status: "APPLIED", shift: { managerId, status: { in: ["OPEN", "FILLED"] } } },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    if (!result.count) return false;
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
    emailQueue.push(await saveNotice(tx, rejectedNote));
    return true;
  });
  if (!changed) redirect(`/manager/shifts/${app.shiftId}/applicants/${app.id}?stale=1`);
  await flushNotificationEmails(emailQueue);
  revalidatePath(`/manager/shifts/${app.shiftId}/applicants`);
  redirect(`/manager/shifts/${app.shiftId}/applicants`);
}
