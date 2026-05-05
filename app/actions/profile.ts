"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  ManagerProfileSchema,
  MarshalProfileSchema,
  PhoneSchema,
} from "@/lib/zod";

export type ProfileActionState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
} | null;

function parseBool(v: unknown): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function saveMarshalProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MARSHAL") redirect("/login");
  const userId = session.user.id;

  const parsed = MarshalProfileSchema.safeParse({
    phone: formData.get("phone") ?? "",
    fullName: formData.get("fullName"),
    baseLocation: formData.get("baseLocation"),
    travelRadiusMiles: formData.get("travelRadiusMiles"),
    experienceSummary: formData.get("experienceSummary"),
    availability: formData.get("availability"),
    hasTransport: formData.get("hasTransport") ?? "",
    hasDriversLicence: formData.get("hasDriversLicence") ?? "",
    training: formData.get("training") ?? "",
    photoUrl: formData.get("photoUrl") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors: parsed.error.issues.reduce(
        (acc, i) => {
          acc[i.path.join(".")] = i.message;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }
  const d = parsed.data;
  await prisma.user.update({
    where: { id: userId },
    data: { phone: d.phone },
  });
  await prisma.marshalProfile.upsert({
    where: { userId },
    create: {
      userId,
      fullName: d.fullName,
      baseLocation: d.baseLocation,
      travelRadiusMiles: d.travelRadiusMiles,
      experienceSummary: d.experienceSummary,
      availability: d.availability,
      hasTransport: parseBool(d.hasTransport),
      hasDriversLicence: parseBool(d.hasDriversLicence),
      training: d.training || null,
      photoUrl: d.photoUrl || null,
    },
    update: {
      fullName: d.fullName,
      baseLocation: d.baseLocation,
      travelRadiusMiles: d.travelRadiusMiles,
      experienceSummary: d.experienceSummary,
      availability: d.availability,
      hasTransport: parseBool(d.hasTransport),
      hasDriversLicence: parseBool(d.hasDriversLicence),
      training: d.training || null,
      photoUrl: d.photoUrl || null,
    },
  });
  revalidatePath("/marshal/profile");
  revalidatePath("/marshal");
  redirect("/marshal/profile");
}

export async function saveManagerProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MANAGER") redirect("/login");
  const userId = session.user.id;

  const parsed = ManagerProfileSchema.safeParse({
    companyName: formData.get("companyName"),
    displayName: formData.get("displayName"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors: parsed.error.issues.reduce(
        (acc, i) => {
          acc[i.path.join(".")] = i.message;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }
  const d = parsed.data;
  await prisma.user.update({
    where: { id: userId },
    data: { phone: d.phone },
  });
  await prisma.managerProfile.update({
    where: { userId },
    data: {
      companyName: d.companyName,
      displayName: d.displayName,
    },
  });
  revalidatePath("/manager");
  revalidatePath("/settings");
  redirect("/manager");
}

export async function saveAccountPhoneAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const parsed = PhoneSchema.safeParse({
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid phone" };
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { phone: parsed.data.phone },
  });
  revalidatePath("/settings");
  redirect("/settings");
}
