import type { Prisma } from "@prisma/client";
import { dayAfter, type Schedule } from "./state";
import { isAttendance, type Attendance } from "./attendance";

export type RunBooking = { id: string; attendanceDays: Prisma.JsonValue; releasedFrom: Date | null };
export type DailyRecord = Record<string, Attendance>;

export function recordedDays(value: Prisma.JsonValue): DailyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((pair): pair is [string, Attendance] => isAttendance(pair[1])));
}

export function callKey(date: Date) { return date.toISOString().slice(0, 10); }

// Attendance is recorded in call order for the whole roster. Released calls
// are outside that marshal's booking and never count as an absence.
export function nextAttendanceDate(shift: Schedule, roster: RunBooking[]): Date | null {
  let earliest: Date | null = null;
  for (const booking of roster) {
    const records = recordedDays(booking.attendanceDays);
    let date = shift.startDate;
    while (date <= shift.endDate && (!booking.releasedFrom || date < booking.releasedFrom)) {
      if (!records[callKey(date)]) {
        if (!earliest || date < earliest) earliest = date;
        break;
      }
      date = dayAfter(date);
    }
  }
  return earliest;
}

export function runOutcome(days: DailyRecord, releasedFrom: Date | null) {
  const outcomes = Object.values(days);
  if (!outcomes.length || outcomes.includes("UNRESOLVED")) return "UNRESOLVED";
  if (outcomes.every(outcome => outcome === "NOT_WORKED")) return "NOT_WORKED";
  const flagged = outcomes.includes("WORKED_FLAGGED");
  if (releasedFrom || outcomes.includes("NOT_WORKED")) return flagged ? "PARTIAL_FLAGGED" : "PARTIAL";
  return flagged ? "WORKED_FLAGGED" : "WORKED";
}
