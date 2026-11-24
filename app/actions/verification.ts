"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { confirmEmailVerification, issueEmailVerification } from "@/lib/email-verification";
import { redirect } from "next/navigation";

export async function resendVerificationAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/verify-email");
  const delivery = await issueEmailVerification(user.id, user.email);
  redirect(`/verify-email?delivery=${delivery}`);
}

export async function confirmEmailAction(rawToken: string) {
  const verified = await confirmEmailVerification(rawToken);
  redirect(verified ? "/login?verified=1" : "/verify-email/invalid");
}
