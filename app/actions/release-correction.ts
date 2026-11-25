"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFounder } from "@/lib/access";
import { conflictingBooking } from "@/lib/booking-conflict";
import { lockShift } from "@/lib/booking-lock";
import { prisma } from "@/lib/db";
import { flushNotificationEmails, saveNotice } from "@/lib/notify";
import { callKey } from "@/lib/run-attendance";
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
