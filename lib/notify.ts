import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { isPilotParticipant } from "@/lib/pilot-participant";
import { prisma } from "@/lib/db";
import type { NotificationKind } from "@/lib/types";
import { beforeCall, hasShiftEnded } from "@/lib/state";
import { clearedFor } from "@/lib/vacancy-brief";
import { sendEmail } from "@/lib/mail";
import { waitlistConfirmationEmail } from "@/lib/waitlist-confirmation";

export type NotifyParams = {
  userId: string;
  kind: NotificationKind;
  subject: string;
  body: string;
  link?: string;
};

export async function saveNotice(tx: Prisma.TransactionClient, note: NotifyParams, shiftId?: string) {
  const delivery = await tx.mailDelivery.create({
    data: { shiftId, notification: { create: note } },
    select: { id: true },
  });
  return delivery.id;
}

export async function notifyPendingAfterDropout(tx: Prisma.TransactionClient, shift: { id: string; productionName: string }) {
  const pending = await tx.application.findMany({ where: { shiftId: shift.id, status: "APPLIED" }, select: { id: true, marshalId: true } });
  const queue: string[] = [];
  for (const application of pending) {
    queue.push(await saveNotice(tx, {
      userId: application.marshalId, kind: "SHIFT_STATUS_CHANGED",
      subject: `Still under consideration: ${shift.productionName}`,
      body: "A place is open again. Your application is still under consideration.",
      link: `/marshal/applications/${application.id}`,
    }, shift.id));
  }
  return queue;
}

// Old application messages can contain a name without an application reference.
// Keep their in-app history but never retry an email we cannot authorise.
async function canSendApplicationNotice(notice: { kind: string; userId: string; link: string | null }, shiftId: string | null) {
  if (notice.kind !== "APPLICATION_ACCEPTED" && notice.kind !== "APPLICATION_SUBMITTED") return true;
  if (!shiftId || !notice.link) return false;
  const applicationId = notice.link.split("/").pop();
  if (!applicationId) return false;
  const managerNotice = notice.kind === "APPLICATION_SUBMITTED" &&
    notice.link === `/manager/shifts/${shiftId}/applicants/${applicationId}`;
  if (!managerNotice && notice.link !== `/marshal/applications/${applicationId}`) return false;

  const booking = notice.kind === "APPLICATION_ACCEPTED";
  const activeAccount = { disabledAt: null, emailVerifiedAt: { not: null } };
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      shiftId,
      status: booking ? "ACCEPTED" : "APPLIED",
      marshalId: managerNotice ? undefined : notice.userId,
      marshal: { ...activeAccount, role: "MARSHAL", marshalProfile: { paused: false } },
      shift: {
        managerId: managerNotice ? notice.userId : undefined,
        paused: false,
        status: { in: booking ? ["OPEN", "FILLED", "RECRUITMENT_STOPPED"] : ["OPEN", "FILLED"] },
        manager: { ...activeAccount, role: "MANAGER" },
      },
    },
    select: {
      marshalId: true,
      marshal: { select: { email: true } },
      shift: { include: {
        manager: { select: { email: true } },
        vacancyReleases: {
          where: { activeSlot: "GB-pilot" },
          select: { activeSlot: true, briefVersion: true, expiresAt: true, viewers: true, applicants: true, bookable: true },
          take: 1,
        },
      } },
    },
  });
  if (!application || (booking ? hasShiftEnded(application.shift) : !beforeCall(application.shift))) return false;
  // Holding new introductions preserves service for a still-active, accepted booking.
  if (!booking && !clearedFor(application.shift, application.shift.vacancyReleases[0] ?? null, "apply", application.marshalId)) return false;
  return isPilotParticipant(application.marshal.email, "MARSHAL") &&
    isPilotParticipant(application.shift.manager.email, "MANAGER");
}

export async function dispatchDelivery(id: string, retryNow = false) {
  const lease = randomUUID();
  const now = new Date();
  const claimed = await prisma.mailDelivery.updateMany({
    where: { id, sentAt: null, OR: [{ retryAt: { lte: now } }, ...(retryNow ? [{ lease: null }] : [])] },
    data: { lease, retryAt: new Date(+now + 120000), attempts: { increment: 1 } },
  });
  if (!claimed.count) return;
  const job = await prisma.mailDelivery.findUniqueOrThrow({
    where: { id }, include: { notification: { include: { user: { select: { email: true } } } }, waitlist: true },
  });
  const notice = job.notification;
  const entry = job.waitlist;
  if (entry?.withdrawnAt || (notice && !await canSendApplicationNotice(notice, job.shiftId))) {
    await prisma.mailDelivery.deleteMany({ where: { id, lease } });
    return;
  }
  const origin = process.env.APP_BASE_URL || "https://setru.co.uk";
  const message = notice ? {
    to: notice.user.email, subject: notice.subject,
    body: notice.body + (notice.link ? "\n\n" + new URL(notice.link, origin).href : ""),
  } : entry ? { to: entry.email, ...waitlistConfirmationEmail(entry.role as "MANAGER" | "MARSHAL" | "OTHER") } : null;
  if (!message) throw new Error("Email job has no recipient");
  const result = await sendEmail({ ...message, idempotencyKey: "setru-" + id });
  const delay = Math.min(3600000, 30000 * 2 ** Math.min(job.attempts - 1, 7));
  await prisma.mailDelivery.updateMany({
    where: { id, lease }, data: result.ok
      ? { sentAt: new Date(), lease: null }
      : { retryAt: new Date(Date.now() + delay), lease: null },
  });
}

export async function flushNotificationEmails(ids: string[], retryNow = false) {
  await Promise.allSettled(ids.map(id => dispatchDelivery(id, retryNow)));
}

export async function retryDueDeliveries() {
  const due = await prisma.mailDelivery.findMany({
    where: { sentAt: null, retryAt: { lte: new Date() } }, orderBy: [{ retryAt: "asc" }, { id: "asc" }], take: 30,
    select: { id: true },
  });
  await flushNotificationEmails(due.map(job => job.id));
}
