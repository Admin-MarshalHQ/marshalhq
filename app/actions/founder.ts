"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFounder } from "@/lib/access";
import { FounderNoteSchema } from "@/lib/zod";

// Every action in this file re-asserts founder identity on the server, so a
// stale client-side session or an open browser tab after FOUNDER_EMAILS has
// been changed can't trigger a moderation side-effect.

export async function setMarshalProfilePausedAction(
  profileId: string,
  paused: boolean,
) {
  await requireFounder();
  await prisma.marshalProfile.update({
    where: { id: profileId },
    data: { paused },
  });
  revalidatePath("/founder/profiles");
  revalidatePath(`/founder/profiles/${profileId}`);
}

export async function setShiftPausedAction(shiftId: string, paused: boolean) {
  await requireFounder();
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
  await requireFounder();
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
  await requireFounder();
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
  await requireFounder();
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

export async function updateSupportRequestNoteAction(
  requestId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireFounder();
  const parsed = FounderNoteSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const note = (parsed.data.note ?? "").toString();
  await prisma.supportRequest.update({
    where: { id: requestId },
    data: { founderNote: note ? note : null },
  });
  revalidatePath(`/founder/support/${requestId}`);
  return null;
}

export async function setSupportRequestResolvedAction(
  requestId: string,
  resolved: boolean,
) {
  await requireFounder();
  await prisma.supportRequest.update({
    where: { id: requestId },
    data: { resolvedAt: resolved ? new Date() : null },
  });
  revalidatePath("/founder/support");
  revalidatePath(`/founder/support/${requestId}`);
}

export async function goToFounderRoot() {
  await requireFounder();
  redirect("/founder");
}
