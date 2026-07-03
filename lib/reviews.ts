import type { ReviewDirection } from "@/lib/types";

// Pure helpers for the two-way review feature. Kept free of Prisma so the rules
// can be unit-tested without a database (see scripts/audit_remediation_tests.ts)
// and the server action reads as a straight-line check.

export type ReviewableShift = {
  status: string;
  managerId: string;
};

export type ReviewableApplication = {
  status: string;
  marshalId: string;
};

/**
 * Whether `userId` (acting in `role`) may leave a review on a completed shift.
 *
 * Eligibility:
 *   - The shift must be COMPLETED (reviews only exist for finished work).
 *   - A manager may review only their own shift's booked marshal.
 *   - A marshal may review only a shift they were ACCEPTED on.
 *
 * Returns the direction the review would be written in, or null if not allowed.
 * The unique constraint on (shiftId, authorId, direction) handles the
 * "already reviewed" case in the action; this helper is the participation gate.
 */
export function reviewDirectionFor(
  shift: ReviewableShift,
  application: ReviewableApplication | null,
  userId: string,
  role: string,
): ReviewDirection | null {
  if (shift.status !== "COMPLETED") return null;
  if (role === "MANAGER" && shift.managerId === userId) {
    if (!application || application.status !== "ACCEPTED") return null;
    return "MANAGER_ON_MARSHAL";
  }
  if (role === "MARSHAL") {
    if (
      !application ||
      application.marshalId !== userId ||
      application.status !== "ACCEPTED"
    ) {
      return null;
    }
    return "MARSHAL_ON_MANAGER";
  }
  return null;
}

export type RatingSummary = { average: number; count: number };

/**
 * Average rating (rounded to one decimal) and count for a set of reviews.
 * Returns { average: 0, count: 0 } for an empty list so callers can branch on
 * count without a divide-by-zero.
 */
export function ratingSummary(reviews: { rating: number }[]): RatingSummary {
  if (reviews.length === 0) return { average: 0, count: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

/** "4.5 / 5 · 3 ratings" style label, or a fallback when there are none. */
export function formatRatingSummary(
  summary: RatingSummary,
  emptyLabel = "No ratings yet",
): string {
  if (summary.count === 0) return emptyLabel;
  const plural = summary.count === 1 ? "rating" : "ratings";
  return `${summary.average.toFixed(1)} / 5 · ${summary.count} ${plural}`;
}
