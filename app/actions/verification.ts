"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { replaceEmailVerification } from "@/lib/email-verification";
import { hashEmailVerificationToken } from "@/lib/verify-email";
import { redirect } from "next/navigation";

export async function resendVerificationAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) redirect("/login");
  if (!user.emailVerifiedAt) {
    await replaceEmailVerification(user.id, user.email);
  }
  redirect("/verify-email?resent=1");
}

export async function verifyEmailToken(rawToken: string) {
  const tokenHash = hashEmailVerificationToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false as const };
  }

  const now = new Date();
  const consumed = await prisma.$transaction(async (tx) => {
    const tokenUpdate = await tx.emailVerificationToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (tokenUpdate.count !== 1) return false;
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: now },
    });
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: now },
    });
    return true;
  });

  return consumed ? { ok: true as const } : { ok: false as const };
}
