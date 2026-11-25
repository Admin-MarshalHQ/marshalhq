"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFounder } from "@/lib/access";
import { conflictingBooking } from "@/lib/booking-conflict";
import { lockShift } from "@/lib/booking-lock";
import { prisma } from "@/lib/db";
import { flushNotificationEmails, saveNotice } from "@/lib/notify";
import { disputedRelease, confirmedWork } from "@/lib/attendance";
import { callKey, nextAttendanceDate, recordedDays, runOutcome } from "@/lib/run-attendance";
import { beforeCall } from "@/lib/state";

export async function restoreFutureCallsAction(shiftId: string, bookingId: string, form: FormData) {
  const path = `/founder/shifts/${shiftId}`;
  const reviewer = await requireFounder(true, path);
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason || reason.length > 500 || form.get("confirmed") !== "yes") redirect(path + "?restore=check");

  const jobs: string[] = [];
  const result = await prisma.$transaction(async tx => {
    await lockShift(tx, shiftId);
    const booking = await tx.application.findFirst({
      where: { id: bookingId, shiftId, status: "ACCEPTED", attendance: null,
        shift: { status: { in: ["OPEN", "FILLED", "RECRUITMENT_STOPPED"] }, paused: false, manager: { disabledAt: null } },
        marshal: { disabledAt: null, marshalProfile: { paused: false } },
      },
      include: { shift: true, attendanceChanges: { where: { outcome: "CALLS_RELEASED" },
        orderBy: [{createdAt: "desc"}, {id: "desc"}], take: 1, select: { id: true } } },
    });
    if (!booking?.releasedFrom || callKey(booking.releasedFrom) !== form.get("expectedDate") ||
        (booking.attendanceChanges[0]?.id ?? "legacy") !== form.get("expectedRelease")) return "stale";

    // Acceptance takes the same locks in this order, including on a different shift.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${booking.marshalId} FOR UPDATE`;
    const remaining = { ...booking.shift, startDate: booking.releasedFrom };
    if (await conflictingBooking(tx, booking.marshalId, remaining)) return "conflict";
    if (!beforeCall(remaining)) return "elapsed";

    await tx.application.update({ where: { id: booking.id }, data: { releasedFrom: null } });
    await tx.attendanceChange.create({ data: { applicationId: booking.id, reviewerId: reviewer.id,
      callDate: booking.releasedFrom, previous: "CALLS_RELEASED", outcome: "CALLS_RESTORED", reason } });
    const message = { kind: "SHIFT_STATUS_CHANGED" as const, subject: `Call release corrected: ${booking.shift.productionName}`,
      body: `The release from ${callKey(booking.releasedFrom)} was corrected. The original scheduled calls have been restored. Open the booking to check the current dates or contact Support.` };
    jobs.push(await saveNotice(tx, { ...message, userId: booking.marshalId, link: `/marshal/applications/${booking.id}` }, shiftId));
    jobs.push(await saveNotice(tx, { ...message, userId: booking.shift.managerId, link: `/manager/shifts/${shiftId}` }, shiftId));
    return "saved";
  });
  await flushNotificationEmails(jobs);
  revalidatePath(path);
  revalidatePath(`/manager/shifts/${shiftId}`);
  revalidatePath(`/marshal/applications/${bookingId}`);
  redirect(path + "?restore=" + result);
}

// A past call is never reinstated by changing the release record. Hold the
// disputed dates and derived hiring signals while the restricted case is open.
export async function reviewElapsedReleaseAction(shiftId: string, bookingId: string, form: FormData) {
  const path = `/founder/shifts/${shiftId}`;
  const reviewer = await requireFounder(true, path);
  const reason = String(form.get("reason") ?? "").trim();
  const decision = form.get("decision");
  if (!reason || reason.length > 500 || !["hold", "confirm"].includes(String(decision))) redirect(path + "?releaseReview=check");
  const jobs: string[] = [];
  const result = await prisma.$transaction(async tx => {
    await lockShift(tx, shiftId);
    const booking = await tx.application.findFirst({
      where: { id: bookingId, shiftId, status: "ACCEPTED" },
      include: { shift: true, attendanceChanges: { where: { outcome: { in: ["CALLS_RELEASED", disputedRelease, "RELEASE_CONFIRMED"] } },
        orderBy: [{createdAt: "desc"}, {id: "desc"}], take: 1, select: { id: true } } },
    });
    if (!booking?.releasedFrom || beforeCall({ ...booking.shift, startDate: booking.releasedFrom }) ||
        callKey(booking.releasedFrom) !== form.get("expectedDate") ||
        (booking.attendanceChanges[0]?.id ?? "legacy") !== form.get("expectedChange")) return "stale";
    const hold = decision === "hold";
    if (hold === (booking.attendance === disputedRelease)) return "stale";
    let attendance: string | null = disputedRelease;
    if (!hold) {
      const days = recordedDays(booking.attendanceDays);
      const from = callKey(booking.releasedFrom);
      if (form.get("confirmed") !== "yes" || Object.keys(days).some(date => date >= from)) return "check";
      // Only the original release can be confirmed through this operation.
      // After completion, missing earlier dated evidence remains unresolved.
      attendance = booking.shift.status !== "COMPLETED" ? null
        : nextAttendanceDate(booking.shift, [booking]) ? "UNRESOLVED"
        : runOutcome(days, booking.releasedFrom);
    }
    await tx.application.update({ where: { id: booking.id }, data: { attendance } });
    await tx.attendanceChange.create({ data: { applicationId: booking.id, reviewerId: reviewer.id,
      callDate: booking.releasedFrom, previous: booking.attendance, outcome: hold ? disputedRelease : "RELEASE_CONFIRMED", reason } });
    await tx.$queryRaw`SELECT id FROM "MarshalProfile" WHERE "userId" = ${booking.marshalId} FOR UPDATE`;
    const where = { marshalId: booking.marshalId, ...confirmedWork };
    const completedCount = await tx.application.count({ where });
    const reliableCount = await tx.application.count({ where: { ...where, attendance: "WORKED" } });
    await tx.marshalProfile.updateMany({ where: { userId: booking.marshalId }, data: { completedCount, reliableCount } });
    // Keep the dated inbox record; suppress obsolete release emails still in the queue.
    if (hold) await tx.mailDelivery.deleteMany({ where: { shiftId, sentAt: null, notification: {
      userId: booking.marshalId, link: `/marshal/applications/${booking.id}`, kind: "SHIFT_STATUS_CHANGED",
      subject: { startsWith: "Remaining calls released:" },
    } } });
    const message = {
      kind: "SHIFT_STATUS_CHANGED" as const,
      subject: `Call release review: ${booking.shift.productionName}`,
      body: hold
        ? `The release from ${callKey(booking.releasedFrom)} is under review. Attendance for those dates, completion credit and reviews are withheld. Contact Support with your account of the calls.`
        : `The original release from ${callKey(booking.releasedFrom)} has been confirmed after review. Your booking shows the current work record. You can challenge the decision through Support.`,
    };
    jobs.push(await saveNotice(tx, { ...message, userId: booking.marshalId, link: `/marshal/applications/${booking.id}` }, shiftId));
    jobs.push(await saveNotice(tx, { ...message, userId: booking.shift.managerId, link: `/manager/shifts/${shiftId}` }, shiftId));
    return hold ? "held" : "confirmed";
  });
  await flushNotificationEmails(jobs);
  revalidatePath(path);
  revalidatePath(`/manager/shifts/${shiftId}`);
  revalidatePath(`/marshal/applications/${bookingId}`);
  revalidatePath("/marshal/history");
  redirect(path + "?releaseReview=" + result);
}
