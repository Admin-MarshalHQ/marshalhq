import { dayAfter, type Schedule } from "./state";
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

export function bookedSchedule<T extends Schedule>(booking: { shift: T; releasedFrom?: Date | null }): T {
  return booking.releasedFrom ? { ...booking.shift, endDate: dayAfter(booking.releasedFrom, -1) } : booking.shift;
}

// Compare half-open daily working intervals. A call can overlap another call
// on the same date, the previous date or the following date. London clock
// order is preserved because ambiguous times always use their first occurrence.
export function schedulesOverlap(a: Schedule, b: Schedule): boolean {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const aCall = minutes(a.dailyStartTime), bCall = minutes(b.dailyStartTime);
  const aWrap = minutes(a.dailyEndTime) + (a.dailyEndTime < a.dailyStartTime ? 1440 : 0);
  const bWrap = minutes(b.dailyEndTime) + (b.dailyEndTime < b.dailyStartTime ? 1440 : 0);
  return [-1, 0, 1].some(offset => {
    const delta = offset * 1440;
    return aCall < bWrap + delta && bCall + delta < aWrap &&
      datesOverlap(a.startDate, a.endDate, dayAfter(b.startDate, -offset), dayAfter(b.endDate, -offset));
  });
}

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
  shift: Schedule,
  acceptedShifts: Schedule[],
  blocks: DateBlock[],
): ConflictReason {
  const overlapsBooked = acceptedShifts.some((s) =>
    schedulesOverlap(shift, s),
  );
  if (overlapsBooked) return "booked";
  const lastBusyDate = shift.dailyEndTime < shift.dailyStartTime && shift.dailyEndTime !== "00:00" ? dayAfter(shift.endDate) : shift.endDate;
  const overlapsBlock = blocks.some((b) =>
    datesOverlap(shift.startDate, lastBusyDate, b.startDate, b.endDate),
  );
  if (overlapsBlock) return "marked-unavailable";
  return null;
}
