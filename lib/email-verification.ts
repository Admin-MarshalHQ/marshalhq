import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { verificationEmail } from "@/lib/auth-emails";
import {
  buildEmailVerificationUrl,
  emailVerificationExpiry,
  generateRawEmailVerificationToken,
  hashEmailVerificationToken,
} from "@/lib/verify-email";

export async function issueEmailVerification(userId: string, email: string) {
  const raw = generateRawEmailVerificationToken();
  const created = await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashEmailVerificationToken(raw), expiresAt: emailVerificationExpiry() },
    select: { id: true, createdAt: true },
  });
  const result = await sendEmail({
    to: email,
    ...verificationEmail(buildEmailVerificationUrl(raw)),
  });
  const now = new Date();
  if (!result.ok) {
    console.error("[verification] email failed to send", { userId, reason: result.reason });
    await prisma.emailVerificationToken.updateMany({
      where: { id: created.id, usedAt: null },
      data: { usedAt: now },
    });
    return "failed";
  }
  if (result.channel === "console") return "local";

  // A slow dispatch must never retire a link issued by a later resend.
  await prisma.emailVerificationToken.updateMany({
    where: {
      userId,
      usedAt: null,
      OR: [
        { createdAt: { lt: created.createdAt } },
        { createdAt: created.createdAt, id: { lt: created.id } },
      ],
    },
    data: { usedAt: now },
  });
  return "sent";
}

export async function emailVerificationState(rawToken: string) {
  if (typeof rawToken !== "string" || !/^[a-f0-9]{64}$/.test(rawToken)) return "invalid";
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashEmailVerificationToken(rawToken) },
    select: { usedAt: true, expiresAt: true, user: { select: { emailVerifiedAt: true } } },
  });
  if (record?.user.emailVerifiedAt) return "verified";
  if (!record || record.usedAt || record.expiresAt <= new Date()) return "invalid";
  return "ready";
}

export async function confirmEmailVerification(rawToken: string) {
  if (typeof rawToken !== "string" || !/^[a-f0-9]{64}$/.test(rawToken)) return false;
  const tokenHash = hashEmailVerificationToken(rawToken);
  return prisma.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    if (!record) return false;

    // Serialise confirmations from different links for the same account.
    const [user] = await tx.$queryRaw<{ emailVerifiedAt: Date | null }[]>`
      SELECT "emailVerifiedAt" FROM "User" WHERE id = ${record.userId} FOR UPDATE
    `;
    if (!user) return false;
    if (user.emailVerifiedAt) return true;

    const now = new Date();
    const consumed = await tx.emailVerificationToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: now } });
    await tx.emailVerificationToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
    return true;
  });
}
