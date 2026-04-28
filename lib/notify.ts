import { prisma } from "@/lib/db";
import type { NotificationKind } from "@/lib/types";
import { sendEmail } from "@/lib/mail";

export type NotifyParams = {
  userId: string;
  kind: NotificationKind;
  subject: string;
  body: string;
};

/**
 * Send the transactional email for a notification.
 *
 * The in-app Notification row is written by the caller (typically inside a
 * Prisma transaction). This helper handles only the email side channel:
 * it looks up the recipient's address and sends via lib/mail.
 *
 * Failures are logged and swallowed so email problems never roll back or
 * surface inside a server action. A failure returns `{ ok: false }` so a
 * caller that cares can differentiate, but the common case ignores the
 * result — email is a side channel, not part of the workflow contract.
 */
export async function emailForNotification(
  params: NotifyParams,
): Promise<{ ok: boolean }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true },
    });
    if (!user) {
      console.error("[notify] recipient missing", {
        userId: params.userId,
        kind: params.kind,
      });
      return { ok: false };
    }
    const result = await sendEmail({
      to: user.email,
      subject: params.subject,
      body: params.body,
    });
    if (!result.ok) {
      console.error("[notify] email send failed", {
        userId: params.userId,
        kind: params.kind,
        reason: result.reason,
      });
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[notify] email dispatch threw", {
      userId: params.userId,
      kind: params.kind,
      err,
    });
    return { ok: false };
  }
}

/**
 * Fan out emails for a batch of notifications concurrently.
 * Wraps Promise.allSettled so a single failure never aborts the batch.
 */
export async function flushNotificationEmails(
  queue: NotifyParams[],
): Promise<void> {
  if (queue.length === 0) return;
  await Promise.allSettled(queue.map(emailForNotification));
}
