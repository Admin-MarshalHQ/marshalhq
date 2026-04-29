"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ShiftDraftSchema } from "@/lib/zod";
import {
  assertShiftTransition,
  canCompleteShift,
  isShiftSchedulable,
} from "@/lib/state";
import { flushNotificationEmails, type NotifyParams } from "@/lib/notify";
import { hasContactLeak } from "@/lib/contact-detect";

async function requireManagerId() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MANAGER") {
    redirect("/login");
  }
  return session.user.id as string;
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
  await prisma.shift.update({
    where: { id },
    data: {
      productionName: d.productionName,
      location: d.location,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      dailyStartTime: d.dailyStartTime,
      dailyEndTime: d.dailyEndTime,
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
  await prisma.shift.update({
    where: { id },
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
  const activeApps = await prisma.application.count({
    where: { shiftId: id, status: { in: ["APPLIED", "ACCEPTED"] } },
  });
  if (activeApps > 0) {
    revalidatePath(`/manager/shifts/${id}`);
    redirect(`/manager/shifts/${id}?revertBlocked=1`);
  }
  await prisma.shift.update({ where: { id }, data: { status: "DRAFT" } });
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}

export async function closeShiftAction(id: string) {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);
  if (!["DRAFT", "OPEN", "FILLED"].includes(shift.status)) {
    throw new Error("Shift cannot be closed from current state.");
  }
  assertShiftTransition(shift.status, "CLOSED");

  const wasFilled = shift.status === "FILLED" && !!shift.acceptedApplicationId;

  const emailQueue: NotifyParams[] = [];
  // Holds the accepted marshal's user id so we can create + email a clear
  // "shift cancelled" notification outside the transaction. Set only on the
  // cancel-after-accept path.
  let cancelledAcceptedMarshalId: string | null = null;

  await prisma.$transaction(async (tx) => {
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
    // If there was an accepted application, mark it WITHDRAWN (the booking
    // is cancelled) but keep the shift's acceptedApplicationId pointer so
    // the trust history survives: founder review and future references can
    // still see who had been booked. Contact release is gated on
    // (acceptedApplication.status === ACCEPTED) AND shift.status in
    // {FILLED, COMPLETED}, so a CLOSED shift won't surface contact even
    // with the pointer preserved.
    if (shift.acceptedApplicationId) {
      const accepted = await tx.application.findUnique({
        where: { id: shift.acceptedApplicationId },
        select: { marshalId: true, status: true },
      });
      if (accepted && accepted.status === "ACCEPTED") {
        await tx.application.update({
          where: { id: shift.acceptedApplicationId },
          data: { status: "WITHDRAWN", decidedAt: new Date() },
        });
        cancelledAcceptedMarshalId = accepted.marshalId;
      }
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
    if (cancelledAcceptedMarshalId) {
      const cancelNote: NotifyParams = {
        userId: cancelledAcceptedMarshalId,
        kind: "SHIFT_STATUS_CHANGED",
        subject: `Shift cancelled: ${shift.productionName}`,
        body:
          `The manager has cancelled this shift. The booking is closed and the shift will not be marked as completed.\n\n` +
          `If you have questions about this cancellation, contact MarshalHQ support and we\u2019ll follow up.`,
      };
      await tx.notification.create({ data: cancelNote });
      emailQueue.push(cancelNote);
    }
  });
  await flushNotificationEmails(emailQueue);
  // Revalidate both the shift detail and the accepted marshal's application
  // history so the status change is visible on refresh.
  revalidatePath(`/manager/shifts/${id}`);
  if (wasFilled) {
    revalidatePath("/marshal/applications");
  }
  redirect(`/manager/shifts/${id}`);
}

export async function completeShiftAction(
  id: string,
  reliabilityFlag: boolean,
) {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);
  if (shift.status !== "FILLED") {
    throw new Error("Only filled shifts can be completed.");
  }
  assertShiftTransition(shift.status, "COMPLETED");

  if (!canCompleteShift(shift)) {
    throw new Error("Shift cannot be completed before the scheduled end time.");
  }

  const emailQueue: NotifyParams[] = [];
  await prisma.$transaction(async (tx) => {
    if (!shift.acceptedApplicationId) {
      throw new Error("No accepted applicant on shift.");
    }
    const accepted = await tx.application.findUnique({
      where: { id: shift.acceptedApplicationId },
    });
    if (!accepted) throw new Error("Accepted application missing.");

    await tx.shift.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        reliabilityFlag,
      },
    });

    // Update marshal profile counts
    await tx.marshalProfile.update({
      where: { userId: accepted.marshalId },
      data: {
        completedCount: { increment: 1 },
        reliableCount: { increment: reliabilityFlag ? 1 : 0 },
      },
    });

    const completedNote: NotifyParams = {
      userId: accepted.marshalId,
      kind: "SHIFT_STATUS_CHANGED",
      subject: `Shift completed: ${shift.productionName}`,
      body: reliabilityFlag
        ? `The manager marked your shift as completed and reliable. It is now on your completion history.`
        : `The manager marked the shift as completed but flagged a reliability issue.`,
    };
    await tx.notification.create({ data: completedNote });
    emailQueue.push(completedNote);
  });
  await flushNotificationEmails(emailQueue);
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}

export async function reopenAfterDropoutAction(id: string) {
  const managerId = await requireManagerId();
  const shift = await getOwnedShift(id, managerId);
  if (shift.status !== "FILLED" || !shift.acceptedApplicationId) return;
  assertShiftTransition(shift.status, "OPEN");

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: shift.acceptedApplicationId! },
      data: { status: "WITHDRAWN", decidedAt: new Date() },
    });
    await tx.shift.update({
      where: { id },
      data: { status: "OPEN", acceptedApplicationId: null },
    });
  });
  revalidatePath(`/manager/shifts/${id}`);
  redirect(`/manager/shifts/${id}`);
}
