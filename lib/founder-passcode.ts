import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { isFounderEmail } from "@/lib/founder-identity";
import { sendEmail } from "@/lib/mail";
import type { Role } from "@/lib/types";
import { ForgotPasswordSchema } from "@/lib/zod";

const PASSCODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function passcodeHash(secret: string, challengeId: string, code: string): Buffer {
  return createHmac("sha256", secret).update(`founder-login:${challengeId}:${code}`).digest();
}

export async function issueFounderPasscode(email: string): Promise<void> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || !isFounderEmail(email)) return;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;

  const code = String(randomInt(100_000_000)).padStart(8, "0");
  const challengeId = randomUUID();
  const issuedAt = new Date();
  const data = {
    challengeId,
    codeHash: passcodeHash(secret, challengeId, code).toString("hex"),
    issuedAt,
    expiresAt: new Date(issuedAt.getTime() + PASSCODE_TTL_MS),
    attempts: 0,
  };

  // Uniqueness handles the first request. Concurrent resends compete on a
  // conditional update so only one request in the cooldown can send a code.
  const table = prisma.founderLoginPasscode;
  const created = await table.createMany({ data: { userId: user.id, ...data }, skipDuplicates: true });
  if (!created.count) {
    const replaced = await table.updateMany({
      where: { userId: user.id, issuedAt: { lte: new Date(issuedAt.getTime() - RESEND_COOLDOWN_MS) } },
      data,
    });
    if (!replaced.count) return;
  }

  const result = await sendEmail({
    to: email,
    subject: "Your Setru founder login code",
    body: `Your Setru founder login code is ${code}.\n\nIt expires in 10 minutes and can only be used once. If you did not request it, you can ignore this email.`,
  });
  if (!result.ok) {
    await table.updateMany({ where: { userId: user.id, challengeId }, data: { codeHash: null } });
  }
}

export async function consumeFounderPasscode(rawEmail: unknown, rawCode: unknown) {
  const emailInput = ForgotPasswordSchema.safeParse({ email: rawEmail });
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!secret || !emailInput.success || !/^\d{8}$/.test(code)) return null;
  const { email } = emailInput.data;
  if (!isFounderEmail(email)) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, emailVerifiedAt: true, founderLoginPasscode: true },
  });
  const passcode = user?.founderLoginPasscode;
  const codeHash = passcode?.codeHash;
  if (!user || !passcode || !codeHash) return null;

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const where = {
      userId: user.id,
      challengeId: passcode.challengeId,
      codeHash,
      expiresAt: { gt: now },
      attempts: { lt: MAX_ATTEMPTS },
    };
    const matches = timingSafeEqual(
      passcodeHash(secret, passcode.challengeId, code),
      Buffer.from(codeHash, "hex"),
    );
    if (!matches) {
      await tx.founderLoginPasscode.updateMany({ where, data: { attempts: { increment: 1 } } });
      return null;
    }

    const consumed = await tx.founderLoginPasscode.updateMany({ where, data: { codeHash: null } });
    if (!consumed.count) return null;

    // A successful passcode also proves ownership of the account email.
    if (!user.emailVerifiedAt) {
      await tx.user.updateMany({
        where: { id: user.id, email, emailVerifiedAt: null },
        data: { emailVerifiedAt: now },
      });
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      emailVerifiedAt: (user.emailVerifiedAt ?? now).toISOString(),
    };
  });
}
