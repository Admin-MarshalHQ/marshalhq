"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isReservedSignupEmail, requireUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { flushNotificationEmails } from "@/lib/notify";
import { acknowledgedDocuments, recordAgreement } from "@/lib/pilot-agreement";
import { admissionOpen, digest } from "@/lib/pilot-documents";
import { invitedRole } from "@/lib/pilot-participant";
import { allowRequest } from "@/lib/request-budget";
import { SignupSchema } from "@/lib/zod";

export type JoinState = { message: string } | null;
const paused = { message: "Private pilot admission is paused. Existing accounts can still log in." };
const requestReceived = { message: "If this address is invited and needs an account, check its inbox for a code. If you already have an account, log in." };

export async function requestJoinCode(_state: JoinState, form: FormData): Promise<JoinState> {
  if (!admissionOpen()) return paused;
  const parsed = z.string().trim().toLowerCase().max(254).email().safeParse(form.get("email"));
  if (!parsed.success) return { message: "Enter the address that received your invitation." };
  const email = parsed.data;
  if (!await allowRequest("pilotJoin", email)) return requestReceived;
  const role = invitedRole(email);
  if (!role || role === "CONFLICT" || isReservedSignupEmail(email)) return requestReceived;
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return requestReceived;

  const raw = randomBytes(16).toString("hex");
  const tokenHash = digest(raw);
  const now = new Date();
  await prisma.pilotJoinCode.deleteMany({ where: { expiresAt: { lte: now } } });
  await prisma.pilotJoinCode.create({ data: { email, role, tokenHash, expiresAt: new Date(+now + 30 * 60_000) } });
  const delivery = await sendEmail({ to: email, subject: "Your private Setru registration code",
    body: `Use this code to create your invited ${role.toLowerCase()} account at https://setru.co.uk/pilot/join within 30 minutes:\n\n${raw}\n\nOnly enter it on Setru. If you did not request a code, leave it unused.` });
  if (!delivery.ok) await prisma.pilotJoinCode.deleteMany({ where: { tokenHash } });
  return requestReceived;
}

export async function registerPilotAccount(_state: JoinState, form: FormData): Promise<JoinState> {
  if (!admissionOpen()) return paused;
  const docs = acknowledgedDocuments(form);
  if (!docs) return { message: "Read the current terms and privacy notice, then confirm both boxes." };
  const parsed = SignupSchema.safeParse({
    email: form.get("email"), password: form.get("password"), role: form.get("role"),
    companyName: form.get("companyName") ?? "", displayName: form.get("displayName") ?? "",
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the account details." };
  const { email, role, password, companyName, displayName } = parsed.data;
  const invalid = { message: "Check your invitation address, role and code. Request a new code if needed." };
  const raw = String(form.get("code") ?? "").trim();
  if (!/^[0-9a-f]{32}$/.test(raw) || isReservedSignupEmail(email) || role !== invitedRole(email)) return invalid;
  const tokenHash = digest(raw);
  // Cheap lookup before hashing a password. The transaction consumes the code
  // a second time under its current expiry before creating anything.
  const code = await prisma.pilotJoinCode.findFirst({ where: { tokenHash, email, role, expiresAt: { gt: new Date() } }, select: { tokenHash: true } });
  if (!code) return invalid;
  const passwordHash = await bcrypt.hash(password, 10);
  let job: string | null = null;
  try {
    const created = await prisma.$transaction(async tx => {
      const now = new Date();
      const used = await tx.pilotJoinCode.deleteMany({ where: { tokenHash, email, role, expiresAt: { gt: now } } });
      if (!used.count) return false;
      const createdUser = await tx.user.create({ data: { email, passwordHash, role, emailVerifiedAt: now,
        ...(role === "MANAGER" && { managerProfile: { create: { companyName: companyName!, displayName: displayName! } } }),
      } });
      job = await recordAgreement(tx, createdUser.id, role, docs);
      await tx.pilotJoinCode.deleteMany({ where: { email } });
      return true;
    });
    if (!created) return invalid;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return invalid;
    throw error;
  }
  if (job) await flushNotificationEmails([job]);
  redirect("/login?verified=1&next=/pilot/agreement");
}

export async function acknowledgePilotDocuments(_state: JoinState, form: FormData): Promise<JoinState> {
  const user = await requireUser();
  if (!admissionOpen()) return paused;
  const role = invitedRole(user.email);
  if (!user.emailVerifiedAt || !role || role === "CONFLICT" || role !== user.role || isReservedSignupEmail(user.email!)) {
    return { message: "This invitation requires the verified account and role named by the operator." };
  }
  const docs = acknowledgedDocuments(form);
  if (!docs) return { message: "Read the current versions and confirm both boxes." };
  const job = await prisma.$transaction(tx => recordAgreement(tx, user.id, role, docs));
  if (job) await flushNotificationEmails([job]);
  redirect("/pilot/agreement");
}
