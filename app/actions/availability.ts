"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AvailabilityBlockSchema } from "@/lib/zod";

export type AvailabilityActionState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
} | null;

async function requireMarshalId() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MARSHAL") {
    redirect("/login");
  }
  return session.user.id as string;
}

export async function addAvailabilityBlockAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const marshalId = await requireMarshalId();
  const parsed = AvailabilityBlockSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    note: formData.get("note") ?? "",
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
  await prisma.availabilityBlock.create({
    data: {
      marshalId,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      note: d.note || null,
    },
  });
  revalidatePath("/marshal/availability");
  redirect("/marshal/availability");
}

export async function removeAvailabilityBlockAction(id: string) {
  const marshalId = await requireMarshalId();
  // updateMany-style ownership guard: deleteMany scoped to the owner means a
  // block belonging to another marshal is a no-op rather than an error.
  await prisma.availabilityBlock.deleteMany({
    where: { id, marshalId },
  });
  revalidatePath("/marshal/availability");
  redirect("/marshal/availability");
}
