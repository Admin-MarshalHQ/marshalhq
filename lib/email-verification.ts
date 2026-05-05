import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import {
  buildEmailVerificationUrl,
  emailVerificationExpiry,
  generateRawEmailVerificationToken,
  hashEmailVerificationToken,
} from "@/lib/verify-email";

export async function issueEmailVerification(userId: string, email: string) {
  const raw = generateRawEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(raw);
  const created = await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: emailVerificationExpiry(),
    },
    select: { id: true },
  });
  const url = buildEmailVerificationUrl(raw);
  const result = await sendEmail({
    to: email,
    subject: "Verify your MarshalHQ email",
    body:
      `Thanks for joining the MarshalHQ private pilot.\n\n` +
      `Use this link to verify your email address. The link expires in 24 hours and can only be used once.\n\n` +
      `${url}\n\n` +
      `If you did not create this account, you can ignore this email.`,
  });
  if (!result.ok) {
    console.error("[verification] email failed to send", {
      userId,
      reason: result.reason,
    });
    await prisma.emailVerificationToken
      .update({ where: { id: created.id }, data: { usedAt: new Date() } })
      .catch(() => undefined);
    return { ok: false };
  }
  return { ok: true };
}

export async function replaceEmailVerification(userId: string, email: string) {
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return issueEmailVerification(userId, email);
}
