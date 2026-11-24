"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { founderFreshness } from "@/lib/session-policy";
import { isFounderSession } from "@/lib/founder-identity";
import { requireFounder } from "@/lib/access";
import { invitedRole } from "@/lib/pilot-participant";
import { isFounderEmail } from "@/lib/founder-identity";
import { ManagerProfileSchema, FounderNoteSchema } from "@/lib/zod";

// Every action in this file re-asserts founder identity on the server, so a
// stale client-side session or an open browser tab after FOUNDER_EMAILS has
// been changed can't trigger a moderation side-effect.

export async function setMarshalProfilePausedAction(
  profileId: string,
  paused: boolean,
) {
  await requireFounder(true);
  await prisma.marshalProfile.update({
    where: { id: profileId },
    data: { paused },
  });
  revalidatePath("/founder/profiles");
  revalidatePath(`/founder/profiles/${profileId}`);
}

export async function setShiftPausedAction(shiftId: string, paused: boolean) {
  await requireFounder(true);
  await prisma.shift.update({
    where: { id: shiftId },
    data: { paused },
  });
  revalidatePath("/founder/shifts");
  revalidatePath(`/founder/shifts/${shiftId}`);
}

export async function updateMarshalProfileNoteAction(
  profileId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireFounder(true);
  const parsed = FounderNoteSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const note = (parsed.data.note ?? "").toString();
  await prisma.marshalProfile.update({
    where: { id: profileId },
    data: { founderNote: note ? note : null },
  });
  revalidatePath(`/founder/profiles/${profileId}`);
  return null;
}

export async function updateShiftNoteAction(
  shiftId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireFounder(true);
  const parsed = FounderNoteSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const note = (parsed.data.note ?? "").toString();
  await prisma.shift.update({
    where: { id: shiftId },
    data: { founderNote: note ? note : null },
  });
  revalidatePath(`/founder/shifts/${shiftId}`);
  return null;
}

export async function updateManagerProfileNoteAction(
  profileId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireFounder(true);
  const parsed = FounderNoteSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const note = (parsed.data.note ?? "").toString();
  await prisma.managerProfile.update({
    where: { id: profileId },
    data: { founderNote: note ? note : null },
  });
  revalidatePath(`/founder/users/${profileId}`);
  revalidatePath("/founder/users");
  return null;
}

export type SupportNoteState = {
  error?: string;
  needsLogin?: boolean;
  savedRevision?: number;
  conflict?: { revision: number; founderNote: string | null; resolvedAt: Date | null };
} | null;

export async function updateSupportRequestNoteAction(
  requestId: string, _prev: SupportNoteState, formData: FormData,
): Promise<SupportNoteState> {
  const user = (await auth())?.user;
  if (!isFounderSession(user) || !user?.founderIssuedAt || Date.now() - user.founderIssuedAt >= founderFreshness) {
    return { needsLogin: true, error: "Sign in again in a new tab, then return here to save your draft." };
  }
  const parsed = FounderNoteSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) return { error: "Enter a note of up to 1,000 characters." };
  const rawRevision = formData.get("revision");
  const revision = Number(rawRevision);
  if (typeof rawRevision !== "string" || !/^\d+$/.test(rawRevision) || !Number.isSafeInteger(revision)) return { error: "Reload this case before saving." };
  const result = await prisma.supportRequest.updateMany({
    where: { id: requestId, revision },
    data: { founderNote: parsed.data.note || null, revision: { increment: 1 } },
  });
  if (!result.count) {
    const current = await prisma.supportRequest.findUnique({ where: { id: requestId }, select: { revision: true, founderNote: true, resolvedAt: true } });
    return current ? { error: "The case changed in another tab. Review the latest note and status before retrying.", conflict: current } : { error: "This case is no longer available." };
  }
  revalidatePath(`/founder/support/${requestId}`);
  return { savedRevision: revision + 1 };
}

export async function setSupportRequestResolvedAction(requestId: string, resolved: boolean, revision: number) {
  const path = `/founder/support/${requestId}`;
  await requireFounder(true, path);
  const result = await prisma.supportRequest.updateMany({
    where: { id: requestId, revision, resolvedAt: resolved ? null : { not: null } },
    data: { resolvedAt: resolved ? new Date() : null, revision: { increment: 1 } },
  });
  revalidatePath("/founder/support");
  revalidatePath(path);
  if (!result.count) redirect(path + "?triage=conflict");
}

export async function goToFounderRoot() {
  await requireFounder(true);
  redirect("/founder");
}

export async function correctPilotRoleAction(id: string, previous: string, form: FormData) {
  await requireFounder(true, "/founder/users");
  const next = previous === "MANAGER" ? "MARSHAL" : "MANAGER";
  const saved = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id }, include: { _count: { select: { shifts: true, applications: true } } } });
    if (!user || user.role !== previous || user.disabledAt || isFounderEmail(user.email) ||
        user._count.shifts || user._count.applications) return false;
    const intended = invitedRole(user.email);
    if (intended && intended !== next) return false;
    if (next === "MANAGER") {
      const details = ManagerProfileSchema.safeParse({ companyName: form.get("companyName"), displayName: form.get("displayName") });
      if (!details.success) return false;
      await tx.managerProfile.upsert({ where: { userId: id }, create: { userId: id, ...details.data }, update: details.data });
    }
    await tx.user.update({ where: { id }, data: { role: next, sessionVersion: { increment: 1 } } });
    return true;
  });
  revalidatePath("/founder/users");
  redirect(saved ? "/founder/users?role=saved" : "/founder/users?role=blocked");
}
