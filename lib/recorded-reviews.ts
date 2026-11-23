import { prisma } from "@/lib/db";
import type { ReviewDirection } from "@/lib/types";

// Both directions follow the individual booking. A second worked place on the
// same shift cannot make a restricted participant's review eligible.
export async function recordedReviews(subjectId: string, direction: ReviewDirection) {
  const reviews = await prisma.review.findMany({
    where: { subjectId, direction, shift: { status: "COMPLETED" } },
    orderBy: { createdAt: "desc" },
    include: { shift: { select: {
      productionName: true,
      applications: { where: { status: "ACCEPTED", attendance: "WORKED" }, select: { marshalId: true } },
    } } },
  });
  return reviews.filter(review => {
    const marshalId = direction === "MANAGER_ON_MARSHAL" ? subjectId : review.authorId;
    return review.shift.applications.some(application => application.marshalId === marshalId);
  });
}
