"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireFounder } from "@/lib/access";
import { ShiftDraftSchema } from "@/lib/zod";
import {
  assertShiftTransition,
  hasShiftEnded,
  isShiftSchedulable,
} from "@/lib/state";
import { flushNotificationEmails, type NotifyParams } from "@/lib/notify";
import { lockShift } from "@/lib/booking-lock";
import { attendanceLabels, isAttendance, worked } from "@/lib/attendance";
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
  const created = await prisma.shift.create({
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
  revalidatePath("/manager");
  redirect(`/manager/shifts/${created.id}`);
}

export async function updateDraftShiftAction(
  id: string,
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
  await prisma.shift.updateMany({
    where: { id, status: "DRAFT" },
    data: {
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
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}

export async function publishShiftAction(id: string) {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);
  // A paused shift cannot be published — the founder has explicitly put it
  // off-market and we don't want the manager re-surfacing it silently.
  if (shift.paused) {
    redirect(`/manager/shifts/${id}`);
  }
  // Temporal guard: a published shift must be schedulable — end time after
  // start time, and start strictly in the future. "Open" is a trust promise
  // that the shift is live and actionable; stale drafts with a past date
  // must not become OPEN via publish.
  if (!isShiftSchedulable(shift)) {
    revalidatePath(`/manager/shifts/${id}`);
    redirect(`/manager/shifts/${id}?publishBlocked=1`);
  }
  // Contact-leak backstop: re-run the detector on the visible free-text fields
  // at publish time. Save/edit already validates via Zod, so this only catches
  // legacy drafts that pre-date the contact-detection rollout. Without this
  // belt-and-braces check, a contaminated DRAFT created before the schema
  // refinement was added could become OPEN and surface contact text to
  // marshals. Manager is bounced back to the draft with a calm edit prompt.
  if (
    hasContactLeak(
      shift.productionName,
      shift.location,
      shift.duties,
      shift.parkingTravel,
      shift.experienceNotes,
    )
  ) {
    revalidatePath(`/manager/shifts/${id}`);
    redirect(`/manager/shifts/${id}?publishBlocked=contact`);
  }
  assertShiftTransition(shift.status, "OPEN");
  await prisma.shift.updateMany({
    where: { id, status: "DRAFT" },
    data: { status: "OPEN" },
  });
  revalidatePath("/manager");
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}

export async function unpublishShiftAction(id: string) {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);
  assertShiftTransition(shift.status, "DRAFT");
  // Revert-to-draft is only safe when nobody is mid-application. If there are
  // active applicants we refuse, because silently rejecting them on revert
  // damages trust — the manager should close the shift instead so applicants
  // receive a proper outcome. The UI surfaces the same guidance before the
  // request reaches here; this server-side check is the backstop.
  const activeApps = await prisma.$transaction(async (tx) => {
    await lockShift(tx, id);
    const count = await tx.application.count({
      where: { shiftId: id, status: { in: ["APPLIED", "ACCEPTED"] } },
    });
    if (!count) await tx.shift.updateMany({ where: { id, status: "OPEN" }, data: { status: "DRAFT" } });
    return count;
  });
  if (activeApps > 0) {
    revalidatePath(`/manager/shifts/${id}`);
    redirect(`/manager/shifts/${id}?revertBlocked=1`);
  }
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}

export async function closeShiftAction(id: string, expectedStatus: string, expectedBookings: string[]) {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);

  const emailQueue: NotifyParams[] = [];
  const cancelledAcceptedMarshalIds: string[] = [];

  const closed = await prisma.$transaction(async (tx) => {
    await lockShift(tx, id);
    const current = await tx.shift.findUniqueOrThrow({ where: { id } });
    if (current.status !== expectedStatus || !["DRAFT", "OPEN", "FILLED"].includes(current.status)) return false;
    const accepted = await tx.application.findMany({
      where: { shiftId: id, status: "ACCEPTED" },
      select: { id: true, marshalId: true },
    });
    const confirmed = new Set(expectedBookings);
    if (confirmed.size !== accepted.length || accepted.some(app => !confirmed.has(app.id))) return false;
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
        data: { status: "WITHDRAWN", decidedAt: new Date() },
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
        body: `The manager closed this shift without hiring. Your application was not accepted.`,
      };
      await tx.notification.create({ data: note });
      emailQueue.push(note);
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
          `The manager has cancelled this shift. The booking is closed and the shift will not be marked as completed.\n\n` +
          `If you have questions about this cancellation, contact Setru support and we\u2019ll follow up.`,
      };
      await tx.notification.create({ data: cancelNote });
      emailQueue.push(cancelNote);
    }
    return true;
  });
  if (!closed) redirect(`/manager/shifts/${id}?close=stale`);
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
  await settleAttendance(id, form, managerId);
}

export async function resolveAttendanceAction(id: string, form: FormData) {
  await requireFounder();
  await settleAttendance(id, form, null);
}

async function settleAttendance(id: string, form: FormData, managerId: string | null) {
  const queue: NotifyParams[] = [];
  const saved = await prisma.$transaction(async (tx) => {
    await lockShift(tx, id);
    const shift = await tx.shift.findUnique({ where: { id } });
    if (!shift || !hasShiftEnded(shift)) return false;
    if (managerId) {
      if (shift.managerId !== managerId || !["OPEN", "FILLED"].includes(shift.status)) return false;
    } else if (shift.status !== "COMPLETED") return false;
    const applicationId = form.get("applicationId");
    if (!managerId && typeof applicationId !== "string") return false;
    const roster = await tx.application.findMany({
      where: { shiftId: id, status: "ACCEPTED", attendance: managerId ? null : "UNRESOLVED",
        ...(!managerId && typeof applicationId === "string" ? { id: applicationId } : {}),
      },
    });
    if (!roster.length) return false;
    const decisions = roster.map((application) => ({
      application, outcome: form.get(application.id),
    }));
    if (decisions.some(({outcome}) => !isAttendance(outcome) || (!managerId && outcome === "UNRESOLVED"))) return false;
    for (const {application, outcome} of decisions) {
      if (!isAttendance(outcome)) throw new Error("Invalid attendance");
      await tx.application.update({ where: { id: application.id }, data: { attendance: outcome } });
      if (worked(outcome)) {
        await tx.marshalProfile.update({ where: { userId: application.marshalId }, data: {
          completedCount: { increment: 1 }, reliableCount: { increment: outcome === "WORKED" ? 1 : 0 },
        } });
      }
      const note: NotifyParams = {
        userId: application.marshalId, kind: "SHIFT_STATUS_CHANGED",
        subject: `Attendance update: ${shift.productionName}`,
        body: `Recorded outcome: ${attendanceLabels[outcome]}. Contact Setru support if this needs review.`,
      };
      await tx.notification.create({ data: note });
      queue.push(note);
    }
    if (decisions.some(({outcome}) => outcome === "UNRESOLVED")) {
      const founders = (process.env.FOUNDER_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
      const recipients = await tx.user.findMany({ where: { email: { in: founders, mode: "insensitive" } }, select: { id: true } });
      for (const founder of recipients) {
        const note: NotifyParams = { userId: founder.id, kind: "SHIFT_STATUS_CHANGED",
          subject: `Attendance needs review: ${shift.productionName}`,
          body: `Review the disputed bookings in the founder shift record (/founder/shifts/${id}).` };
        await tx.notification.create({ data: note });
        queue.push(note);
      }
    }
    if (managerId) await tx.shift.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
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
  const queue: NotifyParams[] = [];
  await prisma.$transaction(async (tx) => {
    await lockShift(tx, id);
    const shift = await tx.shift.findUnique({ where: { id } });
    if (!shift || shift.managerId !== managerId || !["OPEN", "FILLED"].includes(shift.status) || !isShiftSchedulable(shift)) return;
    const app = await tx.application.findFirst({ where: { id: applicationId, shiftId: id, status: "ACCEPTED" } });
    if (!app) return;
    await tx.application.update({ where: { id: app.id }, data: { status: "WITHDRAWN", decidedAt: new Date() } });
    await tx.shift.update({ where: { id }, data: { status: "OPEN" } });
    const note: NotifyParams = { userId: app.marshalId, kind: "SHIFT_STATUS_CHANGED",
      subject: `Booking withdrawn: ${shift.productionName}`,
      body: "The manager recorded your withdrawal. Contact Setru support if this was unexpected." };
    await tx.notification.create({ data: note });
    queue.push(note);
  });
  await flushNotificationEmails(queue);
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}
