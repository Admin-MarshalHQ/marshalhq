"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireFounder } from "@/lib/access";
import { ShiftDraftSchema } from "@/lib/zod";
import {
  beforeCall,
  hasShiftEnded,
  isShiftSchedulable,
  wrapDateTime,
} from "@/lib/state";
import { flushNotificationEmails, saveNotice, notifyPendingAfterDropout, type NotifyParams } from "@/lib/notify";
import { lockShift } from "@/lib/booking-lock";
import { attendanceLabel, isAttendance, confirmedWork } from "@/lib/attendance";
import { callKey, nextAttendanceDate, recordedDays, runOutcome } from "@/lib/run-attendance";
import { formatDate } from "@/lib/format";
import { hasContactLeak } from "@/lib/contact-detect";

async function requireManagerId() {
  const user = await requireRole("MANAGER");
  return user.id;
}

async function getOwnedShift(id: string, managerId: string) {
  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift || shift.managerId !== managerId) redirect("/manager");
  return shift;
}

export type ShiftActionState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
} | null;

function parseShiftInput(fd: FormData) {
  return ShiftDraftSchema.safeParse({
    productionName: fd.get("productionName"),
    location: fd.get("location"),
    startDate: fd.get("startDate"),
    endDate: fd.get("endDate"),
    dailyStartTime: fd.get("dailyStartTime"),
    dailyEndTime: fd.get("dailyEndTime"),
    marshalsNeeded: fd.get("marshalsNeeded"),
    rate: fd.get("rate"),
    rateUnit: fd.get("rateUnit"),
    duties: fd.get("duties"),
    parkingTravel: fd.get("parkingTravel") ?? "",
    experienceNotes: fd.get("experienceNotes") ?? "",
  });
}

export async function saveDraftShiftAction(
  _prev: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const managerId = await requireManagerId();
  const parsed = parseShiftInput(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first?.message ?? "Invalid input",
      fieldErrors: parsed.error.issues.reduce(
        (acc, i) => {
          acc[i.path.join(".")] = i.message;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }
  const data = parsed.data;
  const created = await prisma.$transaction(async tx => {
    const [actor] = await tx.$queryRaw<{role: string}[]>`SELECT role FROM "User" WHERE id = ${managerId} FOR UPDATE`;
    if (actor?.role !== "MANAGER") return null;
    return tx.shift.create({
    data: {
      managerId,
      productionName: data.productionName,
      location: data.location,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      dailyStartTime: data.dailyStartTime,
      dailyEndTime: data.dailyEndTime,
      marshalsNeeded: data.marshalsNeeded,
      rate: data.rate,
      rateUnit: data.rateUnit,
      duties: data.duties,
      parkingTravel: data.parkingTravel || null,
      experienceNotes: data.experienceNotes || null,
      status: "DRAFT",
    },
  });
  });
  if (!created) return { error: "Your account role changed. Sign in again." };
  revalidatePath("/manager");
  redirect(`/manager/shifts/${created.id}`);
}

export async function updateDraftShiftAction(
  id: string,
  revision: string,
  _prev: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);
  if (shift.status !== "DRAFT") {
    return { error: "Only draft shifts can be edited." };
  }
  const parsed = parseShiftInput(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors: parsed.error.issues.reduce(
        (acc, i) => {
          acc[i.path.join(".")] = i.message;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }
  const d = parsed.data;
  const saved = await prisma.shift.updateMany({
    where: { id, managerId, updatedAt: new Date(revision), status: "DRAFT", applications: { none: {} } },
    data: {
      updatedAt: new Date(Math.max(Date.now(), shift.updatedAt.getTime() + 1)),
      productionName: d.productionName,
      location: d.location,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      dailyStartTime: d.dailyStartTime,
      dailyEndTime: d.dailyEndTime,
      marshalsNeeded: d.marshalsNeeded,
      rate: d.rate,
      rateUnit: d.rateUnit,
      duties: d.duties,
      parkingTravel: d.parkingTravel || null,
      experienceNotes: d.experienceNotes || null,
    },
  });
  if (!saved.count) return { error: "Your changes were not saved. Keep this tab open and review the latest shift in a new tab before retrying." };
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}

export async function publishShiftAction(id: string, revision: string) {
  const managerId = await requireManagerId();
  const result = await prisma.$transaction(async tx => {
    await lockShift(tx, id);
    const shift = await tx.shift.findFirst({ where: { id, managerId, status: "DRAFT", paused: false } });
    if (!shift || shift.updatedAt.toISOString() !== revision || await tx.application.count({ where: { shiftId: id } })) return "?publishBlocked=changed";
    if (!isShiftSchedulable(shift)) return "?publishBlocked=1";
    if (hasContactLeak(shift.productionName, shift.location, shift.duties, shift.parkingTravel, shift.experienceNotes)) {
      return "?publishBlocked=contact";
    }
    await tx.shift.update({ where: { id }, data: { status: "OPEN" } });
    return "";
  });
  revalidatePath("/manager");
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}${result}`);
}

export async function unpublishShiftAction(id: string) {
  const managerId = await requireManagerId();
  await getOwnedShift(id, managerId);
  // Past applications must continue to refer to the terms originally offered.
  const reverted = await prisma.$transaction(async tx => {
    await lockShift(tx, id);
    return tx.shift.updateMany({ where: { id, managerId, status: "OPEN", applications: { none: {} } }, data: { status: "DRAFT" } });
  });
  if (!reverted.count) redirect(`/manager/shifts/${id}?revertBlocked=1`);
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}

export async function closeShiftAction(id: string, expectedStatus: string, expectedBookings: string[]) {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);

  const emailQueue: string[] = [];
  const cancelledAcceptedMarshalIds: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    await lockShift(tx, id);
    const current = await tx.shift.findUniqueOrThrow({ where: { id } });
    if (current.status !== expectedStatus || !["DRAFT", "OPEN", "FILLED"].includes(current.status)) return "stale";
    const accepted = await tx.application.findMany({
      where: { shiftId: id, status: "ACCEPTED" },
      select: { id: true, marshalId: true },
    });
    const confirmed = new Set(expectedBookings);
    if (confirmed.size !== accepted.length || accepted.some(app => !confirmed.has(app.id))) return "stale";
    // A booked shift that has wrapped must settle attendance, not cancel.
    if (accepted.length > 0 && (hasShiftEnded(current) || ((+current.startDate !== +current.endDate || current.dailyEndTime < current.dailyStartTime) && !beforeCall(current)))) return "attendance";
    // Auto-reject all APPLIED applications
    const rejected = await tx.application.findMany({
      where: { shiftId: id, status: "APPLIED" },
      select: { id: true, marshalId: true },
    });
    if (rejected.length) {
      await tx.application.updateMany({
        where: { shiftId: id, status: "APPLIED" },
        data: { status: "REJECTED", decidedAt: new Date() },
      });
    }
    if (accepted.length) {
      await tx.application.updateMany({
        where: { shiftId: id, status: "ACCEPTED" },
        data: { status: "PRODUCTION_CANCELLED", decidedAt: new Date() },
      });
      cancelledAcceptedMarshalIds.push(...accepted.map((a) => a.marshalId));
    }
    await tx.shift.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    // Notifications for affected marshals
    for (const app of rejected) {
      const note: NotifyParams = {
        userId: app.marshalId,
        kind: "APPLICATION_REJECTED",
        subject: `Shift closed: ${shift.productionName}`,
        body: `The manager closed this shift. Your application was not accepted.`,
      };
      emailQueue.push(await saveNotice(tx, note, id));
    }
    // Notify the accepted marshal that the booking has been cancelled. This
    // is the audit-blocking notification: when a FILLED shift is cancelled
    // the accepted marshal must receive a clear outcome so they don't show
    // up to a cancelled job or wonder why the shift vanished.
    for (const marshalId of cancelledAcceptedMarshalIds) {
      const cancelNote: NotifyParams = {
        userId: marshalId,
        kind: "SHIFT_STATUS_CHANGED",
        subject: `Shift cancelled: ${shift.productionName}`,
        body:
          `Production cancelled your booking. This has no attendance or reliability effect. Check your engagement terms with the hirer for any payment due.\n\n` +
          `If you have questions about this cancellation, contact Setru support and we\u2019ll follow up.`,
      };
      emailQueue.push(await saveNotice(tx, cancelNote, id));
    }
    return "closed";
  });
  if (result !== "closed") redirect(`/manager/shifts/${id}?close=${result}`);
  await flushNotificationEmails(emailQueue);
  // Revalidate both the shift detail and the accepted marshal's application
  // history so the status change is visible on refresh.
  revalidatePath(`/manager/shifts/${id}`);
  if (cancelledAcceptedMarshalIds.length > 0) {
    revalidatePath("/marshal/applications");
  }
  redirect(`/manager/shifts/${id}`);
}

export async function completeShiftAction(id: string, form: FormData) {
  const managerId = await requireManagerId();
  await settleAttendance(id, form, managerId, null);
}

export async function resolveAttendanceAction(id: string, form: FormData) {
  const reviewer = await requireFounder(true);
  await settleAttendance(id, form, null, reviewer.id);
}

async function settleAttendance(id: string, form: FormData, managerId: string | null, reviewerId: string | null) {
  const queue: string[] = [];
  const saved = await prisma.$transaction(async (tx) => {
    await lockShift(tx, id);
    const shift = await tx.shift.findUnique({ where: { id } });
    if (!shift) return false;
    const wrapped = hasShiftEnded(shift);
    const multi = +shift.startDate !== +shift.endDate;
    if (!wrapped && (!multi || reviewerId)) return false;
    if (managerId) {
      if (shift.managerId !== managerId || !["OPEN", "FILLED"].includes(shift.status)) return false;
    } else if (shift.status !== "COMPLETED") return false;
    const applicationId = form.get("applicationId");
    if (!managerId && typeof applicationId !== "string") return false;
    const roster = await tx.application.findMany({
      where: { shiftId: id, status: "ACCEPTED", ...(managerId && { attendance: null }),
        ...(!managerId && typeof applicationId === "string" ? { id: applicationId } : {}),
      },
    });
    if (!roster.length) return false;
    const requestedDay = form.get("callDate");
    const daily = multi && (managerId !== null || roster[0].attendanceDays !== null);
    const next = daily && managerId ? nextAttendanceDate(shift, roster) : null;
    const date = daily && reviewerId && typeof requestedDay === "string" ? new Date(requestedDay) : next;
    if (date && (!Number.isFinite(+date) || requestedDay !== callKey(date) ||
        wrapDateTime(date, shift.dailyStartTime, shift.dailyEndTime) > new Date())) return false;
    if (daily && reviewerId && !date) return false;
    if (!date && (requestedDay || !wrapped)) return false;

    const reason = String(form.get("reason") ?? "").trim();
    if (reviewerId && (!reason || reason.length > 500)) return false;
    const entries = [];
    for (const application of roster) {
      const days = recordedDays(application.attendanceDays);
      const key = date && callKey(date);
      const previous = key ? days[key] : application.attendance;
      const excluded = date && application.releasedFrom && date >= application.releasedFrom;
      if (!excluded && (!daily || key)) {
        const selected = form.get(application.id);
        if (!isAttendance(selected)) return false;
        if (reviewerId && (form.get("previous") !== (previous ?? "") || previous === selected || (key && !previous))) return false;
        if (key) days[key] = selected;
        entries.push({ application, days, selected, previous: previous ?? null });
      } else {
        entries.push({ application, days, selected: null, previous: null });
      }
    }
    const finish = wrapped && (!daily || !nextAttendanceDate(shift,
      entries.map(({ application, days }) => ({ ...application, attendanceDays: days }))));
    const decisions = [];
    for (const {application, days, selected, previous} of entries) {
      if (reviewerId && selected) {
        await tx.attendanceChange.create({ data: { applicationId: application.id, reviewerId,
          previous, outcome: selected, reason, callDate: date } });
      }
      const outcome = daily ? runOutcome(days, application.releasedFrom) : selected;
      if (!outcome) return false;
      if (finish || selected) await tx.application.update({ where: { id: application.id },
        data: { ...(daily && selected && { attendanceDays: days }), ...(finish && { attendance: outcome }) } });
      if (!finish) continue;
      decisions.push({outcome});
      const note: NotifyParams = {
        userId: application.marshalId, kind: "SHIFT_STATUS_CHANGED",
        subject: `Attendance update: ${shift.productionName}`,
        body: `Recorded outcome: ${attendanceLabel(outcome)}. Contact Setru support if this needs review.`,
      };
      queue.push(await saveNotice(tx, note, id));
      if (reviewerId) {
        const update = { ...note, userId: shift.managerId, link: `/manager/shifts/${id}`,
          body: "A booking attendance record changed after review. Open the shift to see the current individual outcomes." };
        queue.push(await saveNotice(tx, update, id));
      }
    }
    if (!finish) return true;
    if (decisions.some(({outcome}) => outcome === "UNRESOLVED" || outcome === "WORKED_FLAGGED" || outcome === "PARTIAL_FLAGGED")) {
      const founders = (process.env.FOUNDER_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
      const recipients = await tx.user.findMany({ where: { email: { in: founders, mode: "insensitive" } }, select: { id: true } });
      for (const founder of recipients) {
        const note: NotifyParams = { userId: founder.id, kind: "SHIFT_STATUS_CHANGED",
          subject: `Attendance needs review: ${shift.productionName}`,
          link: `/founder/shifts/${id}`, body: "Open the shift to review the disputed bookings." };
        queue.push(await saveNotice(tx, note, id));
      }
    }
    if (managerId) {
      const pending = await tx.application.findMany({ where: { shiftId: id, status: "APPLIED" }, select: { marshalId: true } });
      await tx.application.updateMany({ where: { shiftId: id, status: "APPLIED" }, data: { status: "REJECTED", decidedAt: new Date() } });
      const notices = pending.map(({ marshalId }): NotifyParams => ({
        userId: marshalId, kind: "SHIFT_STATUS_CHANGED", subject: `Shift completed: ${shift.productionName}`,
        body: "This shift has ended and you were not booked. Your application is now closed.",
      }));
      for (const note of notices) queue.push(await saveNotice(tx, note, id));
      await tx.shift.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
    }
    // Refresh only affected cached counts. Lock in stable order across shifts.
    for (const marshalId of roster.map(app => app.marshalId).sort()) {
      await tx.$queryRaw`SELECT id FROM "MarshalProfile" WHERE "userId" = ${marshalId} FOR UPDATE`;
      const where = { marshalId, ...confirmedWork };
      const completedCount = await tx.application.count({ where });
      const reliableCount = await tx.application.count({ where: { ...where, attendance: "WORKED" } });
      await tx.marshalProfile.update({ where: { userId: marshalId }, data: { completedCount, reliableCount } });
    }
    return true;
  });
  await flushNotificationEmails(queue);
  const page = managerId ? `/manager/shifts/${id}` : `/founder/shifts/${id}`;
  revalidatePath(page);
  revalidatePath("/marshal/history");
  redirect(saved ? page : `${page}?attendance=stale`);
}

export async function reopenAfterDropoutAction(id: string, applicationId: string) {
  const managerId = await requireManagerId();
  const queue: string[] = [];
  const result = await prisma.$transaction(async (tx) => {
    await lockShift(tx, id);
    const shift = await tx.shift.findUnique({ where: { id } });
    if (!shift || shift.managerId !== managerId || !["OPEN", "FILLED"].includes(shift.status)) return "stale";
    if (!beforeCall(shift)) return "started";
    const app = await tx.application.findFirst({ where: { id: applicationId, shiftId: id, status: "ACCEPTED" } });
    if (!app) return "stale";
    await tx.application.update({ where: { id: app.id }, data: { status: "WITHDRAWN", decidedAt: new Date() } });
    await tx.shift.update({ where: { id }, data: { status: "OPEN" } });
    const note: NotifyParams = { userId: app.marshalId, kind: "SHIFT_STATUS_CHANGED",
      subject: `Booking withdrawn: ${shift.productionName}`,
      body: "The manager recorded your withdrawal. Contact Setru support if this was unexpected." };
    queue.push(await saveNotice(tx, note, id));
    if (shift.status === "FILLED") queue.push(...await notifyPendingAfterDropout(tx, shift));
    return "saved";
  });
  await flushNotificationEmails(queue);
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}?dropout=${result}`);
}

export async function retryShiftEmailAction(id: string) {
  const managerId = await requireManagerId();
  await getOwnedShift(id, managerId);
  const jobs = await prisma.mailDelivery.findMany({ where: { shiftId: id, sentAt: null }, take: 30, select: { id: true } });
  await flushNotificationEmails(jobs.map(job => job.id), true);
  revalidatePath(`/manager/shifts/${id}`);
  revalidatePath(`/manager/shifts/${id}/booking`);
}

// Keep past work on the original application when a marshal is released
// mid-run. A replacement for the remaining calls gets a separate listing.
export async function releaseRemainingCallsAction(id: string, bookingId: string, form: FormData) {
  const managerId = await requireManagerId();
  const raw = String(form.get("releaseDate") ?? "");
  const date = new Date(raw);
  const queue: string[] = [];
  const saved = await prisma.$transaction(async tx => {
    await lockShift(tx, id);
    const shift = await tx.shift.findFirst({ where: { id, managerId, paused: false, status: { in: ["OPEN", "FILLED"] } } });
    if (!shift || beforeCall(shift) || !Number.isFinite(+date) || callKey(date) !== raw ||
        date <= shift.startDate || date > shift.endDate || !beforeCall({ ...shift, startDate: date })) return false;
    const booking = await tx.application.findFirst({ where: { id: bookingId, shiftId: id, status: "ACCEPTED", releasedFrom: null } });
    if (!booking) return false;
    await tx.application.update({ where: { id: bookingId }, data: { releasedFrom: date } });
    await tx.attendanceChange.create({ data: { applicationId: booking.id, reviewerId: managerId,
      callDate: date, previous: null, outcome: "CALLS_RELEASED", reason: "Manager recorded an agreed release." } });
    queue.push(await saveNotice(tx, { userId: booking.marshalId, kind: "SHIFT_STATUS_CHANGED",
      link: `/marshal/applications/${booking.id}`, subject: `Remaining calls released: ${shift.productionName}`,
      body: `Your manager released you from calls starting ${formatDate(date)} onwards. Earlier calls stay on your booking. Contact support if this was unexpected.` }, id));
    return true;
  });
  await flushNotificationEmails(queue);
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}${saved ? "" : "?release=stale"}`);
}
