// Pure helpers for the marshal availability calendar. No Prisma here so the
// overlap rules are unit-testable without a DB (see
// scripts/audit_remediation_tests.ts) and the apply guard reads as a switch.

/**
 * Inclusive date-range overlap. Two ranges overlap when each starts on or
 * before the other ends. Comparison is on the raw timestamps; callers pass
 * date-only values (midnight) for whole-day semantics.
 */
export function datesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

export type DateBlock = { startDate: Date; endDate: Date };

export type ConflictReason = "booked" | "marked-unavailable" | null;

/**
 * Classify whether applying to `shift` conflicts with the marshal's existing
 * commitments:
 *   - "booked"            — overlaps a shift they are already accepted on
 *                           (a hard double-booking; the apply action blocks it).
 *   - "marked-unavailable"— overlaps a date range they marked unavailable
 *                           (a soft warning; the marshal can still apply).
 *   - null                — no conflict.
 *
 * "booked" takes precedence over "marked-unavailable" so the stronger signal
 * surfaces when both apply.
 */
export function shiftConflicts(
  shift: DateBlock,
  acceptedShifts: DateBlock[],
  blocks: DateBlock[],
): ConflictReason {
  const overlapsBooked = acceptedShifts.some((s) =>
    datesOverlap(shift.startDate, shift.endDate, s.startDate, s.endDate),
  );
  if (overlapsBooked) return "booked";
  const overlapsBlock = blocks.some((b) =>
    datesOverlap(shift.startDate, shift.endDate, b.startDate, b.endDate),
  );
  if (overlapsBlock) return "marked-unavailable";
  return null;
}
