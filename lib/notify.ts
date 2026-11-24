import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { NotificationKind } from "@/lib/types";
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
  if (notice?.kind === "APPLICATION_ACCEPTED" && notice.link?.startsWith("/marshal/applications/")) {
    const application = await prisma.application.findFirst({
      where: { id: notice.link.slice("/marshal/applications/".length), marshalId: notice.userId, status: "ACCEPTED",
        shift: { status: { in: ["OPEN", "FILLED"] } } }, select: { id: true },
    });
    if (!application) {
      // The booking has since closed. Its inbox history remains, while an
      // obsolete confirmation must never be dispatched after cancellation.
      await prisma.mailDelivery.deleteMany({ where: { id, lease } });
      return;
    }
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
