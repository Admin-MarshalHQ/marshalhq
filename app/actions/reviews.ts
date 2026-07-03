"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ReviewSchema } from "@/lib/zod";
import { reviewDirectionFor } from "@/lib/reviews";
import { flushNotificationEmails, type NotifyParams } from "@/lib/notify";

export type ReviewActionState = { error?: string } | null;

/**
 * Submit a review on a COMPLETED shift. Direction is derived server-side from
 * the actor's role and their participation in the shift, never trusted from the
 * client. One review per side per shift is enforced by the DB unique constraint.
 */
export async function submitReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const role = session.user.role;

  const parsed = ReviewSchema.safeParse({
    shiftId: formData.get("shiftId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid review" };
  }
  const { shiftId, rating, comment } = parsed.data;

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) redirect("/");

  // Find the actor's link to the shift and resolve who the review is about.
  // Manager → the booked (ACCEPTED) marshal; marshal → the shift's manager.
  let application:
    | { id: string; status: string; marshalId: string }
    | null = null;
  let subjectId: string;
  if (role === "MANAGER") {
    application = await prisma.application.findFirst({
      where: { shiftId, status: "ACCEPTED" },
      select: { id: true, status: true, marshalId: true },
    });
    subjectId = application?.marshalId ?? "";
  } else {
    application = await prisma.application.findUnique({
      where: { shiftId_marshalId: { shiftId, marshalId: userId } },
      select: { id: true, status: true, marshalId: true },
    });
    subjectId = shift.managerId;
  }

  const direction = reviewDirectionFor(shift, application, userId, role);
  if (!direction || !subjectId) {
    return { error: "You can’t review this shift." };
  }

  try {
    await prisma.review.create({
      data: {
        shiftId,
        authorId: userId,
        subjectId,
        direction,
        rating,
        comment: comment || null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return { error: "You’ve already reviewed this shift." };
    }
    return { error: "Could not submit your review." };
  }

  const note: NotifyParams = {
    userId: subjectId,
    kind: "REVIEW_RECEIVED",
    subject: `New review: ${shift.productionName}`,
    body: `You received a ${rating}-star review for ${shift.productionName}. See it on your MarshalHQ profile.`,
  };
  await prisma.notification.create({ data: note });
  await flushNotificationEmails([note]);

  if (role === "MANAGER") {
    revalidatePath(`/manager/shifts/${shiftId}/booking`);
    redirect(`/manager/shifts/${shiftId}/booking?reviewed=1`);
  }
  revalidatePath(`/marshal/applications/${application!.id}`);
  redirect(`/marshal/applications/${application!.id}?reviewed=1`);
}
