import type {
  ApplicationStatus,
  Availability,
  ShiftStatus,
} from "@/lib/types";

export const SHIFT_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  DRAFT: ["OPEN", "CLOSED"],
  OPEN: ["DRAFT", "FILLED", "CLOSED", "COMPLETED"],
  FILLED: ["COMPLETED", "OPEN", "CLOSED"],
  CLOSED: [],
  COMPLETED: [],
};

export const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  APPLIED: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: ["WITHDRAWN", "PRODUCTION_CANCELLED"],
  PRODUCTION_CANCELLED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function canTransitionShift(
  from: string,
  to: ShiftStatus,
): boolean {
  return SHIFT_TRANSITIONS[from as ShiftStatus]?.includes(to) ?? false;
}

export function canTransitionApplication(
  from: string,
  to: ApplicationStatus,
): boolean {
  return (
    APPLICATION_TRANSITIONS[from as ApplicationStatus]?.includes(to) ?? false
  );
}

export function assertShiftTransition(from: string, to: ShiftStatus) {
  if (!canTransitionShift(from, to)) {
    throw new Error(`Illegal shift transition: ${from} \u2192 ${to}`);
  }
}

export function assertApplicationTransition(
  from: string,
  to: ApplicationStatus,
) {
  if (!canTransitionApplication(from, to)) {
    throw new Error(`Illegal application transition: ${from} \u2192 ${to}`);
  }
}

// Temporal guard on completion. A FILLED shift can only be marked COMPLETED
// once the scheduled end time on the final day of the block has passed. Kept
// pure so the UI can disable the "Complete" control ahead of time and tests
// can assert without touching the DB.
export type CompletableShift = {
  bookedCount?: number;
  endDate: Date;
  dailyStartTime: string;
  dailyEndTime: string; // "HH:MM"
  status: string;
};

export function canCompleteShift(
  shift: CompletableShift,
  now: Date = new Date(),
): boolean {
  if (shift.status !== "FILLED" && !(shift.status === "OPEN" && (shift.bookedCount ?? 0) > 0)) return false;
  return hasShiftEnded(shift, now);
}

export function hasShiftEnded(
  shift: Pick<CompletableShift, "endDate" | "dailyStartTime" | "dailyEndTime">,
  now: Date = new Date(),
): boolean {
  return wrapDateTime(shift.endDate, shift.dailyStartTime, shift.dailyEndTime).getTime() <= now.getTime();
}

const londonDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
});

export function londonCallDate(now = new Date()) {
  return new Date(londonDate.format(now));
}

const londonHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23",
});

function shiftDateTime(date: Date, time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute);
  // UK clocks are UTC or UTC+1. Prefer the first occurrence at the autumn
  // change and roll a nonexistent spring hour forward.
  const summer = new Date(utc - 3_600_000);
  return Number(londonHour.format(summer)) === hour ? summer : new Date(utc);
}

export const DAY = 86_400_000;

export type Schedule = { startDate: Date; endDate: Date; dailyStartTime: string; dailyEndTime: string };

export function dayAfter(date: Date, offset = 1) {
  return new Date(date.getTime() + offset * DAY);
}

// endDate is the last CALL date. An earlier wrap clock belongs to the following date.
export function wrapDateTime(callDate: Date, call: string, wrap: string) {
  return shiftDateTime(wrap < call ? dayAfter(callDate) : callDate, wrap);
}

export function validShiftWindow(start: Date, end: Date, call: string, wrap: string) {
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end < start ||
      !clock.test(call) || !clock.test(wrap) || call === wrap) return false;
  // Only 01:xx can be skipped by the London spring clock change. Check every
  // occurrence, including the morning after the final night call.
  for (const [time, offset] of [[call, 0], [wrap, wrap < call ? 1 : 0]] as const) {
    if (!time.startsWith("01:")) continue;
    const last = dayAfter(end, offset);
    for (let date = dayAfter(start, offset); date <= last; date = dayAfter(date)) {
      if (londonHour.format(shiftDateTime(date, time)) !== "01") return false;
    }
  }
  return true;
}

export function beforeCall(shift: { startDate: Date; dailyStartTime: string }, now = new Date()) {
  return shiftStartDateTime(shift.startDate, shift.dailyStartTime) > now;
}

/**
 * Combine a shift's `startDate` (date-only) with its `dailyStartTime` ("HH:MM")
 * into a real Date for day 1 of the block. Used by the publish and apply
 * guards: a shift whose first day's start is in the past must not be
 * publishable and must not accept applications, because the trust promise
 * that OPEN means "live, actionable, and safe to apply to" breaks otherwise.
 */
export function shiftStartDateTime(startDate: Date, dailyStartTime: string): Date {
  return shiftDateTime(startDate, dailyStartTime);
}

/**
 * True if the shift is safe to publish or apply to on temporal grounds. The
 * block's first day start must be strictly in the future, every scheduled call and wrap must exist in London time.
 */
export function isShiftSchedulable(
  shift: {
    startDate: Date;
    endDate: Date;
    dailyStartTime: string;
    dailyEndTime: string;
  },
  now: Date = new Date(),
): boolean {
  return validShiftWindow(shift.startDate, shift.endDate, shift.dailyStartTime, shift.dailyEndTime) &&
    beforeCall(shift, now);
}

export const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  FILLED: "Filled",
  CLOSED: "Closed",
  COMPLETED: "Completed",
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "No longer active",
  PRODUCTION_CANCELLED: "Cancelled by production",
};

// Availability gating for the apply flow.
//
// Three stored states map onto two gating outcomes:
//   ACTIVELY_LOOKING   — fully available, no friction on apply
//   OPEN_TO_WORK       — "limited availability": apply allowed, soft reminder
//   UNAVAILABLE        — "not currently available": apply blocked
//
// The soft reminder is a UI-only nudge; the hard block is enforced in the
// server action as well so bypassing the UI can't create applications from
// marshals who've marked themselves out of rotation.
export const AVAILABILITY_LABEL: Record<Availability, string> = {
  ACTIVELY_LOOKING: "Actively looking",
  OPEN_TO_WORK: "Open to work",
  UNAVAILABLE: "Not currently available",
};

export function canMarshalApply(availability: string): boolean {
  return availability !== "UNAVAILABLE";
}

export function isLimitedAvailability(availability: string): boolean {
  return availability === "OPEN_TO_WORK";
}

// ---------------------------------------------------------------------------
// Withdraw-eligibility classification.
//
// The trust model splits withdrawal into three outcomes so the marshal sees
// a single, calm message and the database is never partially mutated:
//
//   "allowed"   — proceed with the WITHDRAWN transition (and reopen the shift
//                 if the app was ACCEPTED before start time).
//   "committed" — the shift has reached an operational commitment stage.
//                 Self-service withdrawal is refused; the user is routed to
//                 support. Reasons: COMPLETED/CLOSED shift (the booking has
//                 already settled in some terminal way), or ACCEPTED on a
//                 FILLED shift whose start time has passed (the manager has
//                 already reorganised their day around the booking).
//   "stale"     — the application is no longer in a withdrawable state — for
//                 example, REJECTED/WITHDRAWN already, or APPLIED on a shift
//                 that has been closed in another tab.
//
// The classification lives here as a pure helper so the rule can be unit-
// tested without standing up a database, and so the action handler reads as a
// single switch on the result instead of a tangle of nested ifs.
// ---------------------------------------------------------------------------
export type WithdrawDecision = "allowed" | "committed" | "stale";

export function classifyWithdraw(
  app: { status: string },
  shift: {
    status: string;
    startDate: Date;
    dailyStartTime: string;
  },
  now: Date = new Date(),
): WithdrawDecision {
  // Only APPLIED and ACCEPTED applications are eligible at all.
  if (app.status !== "APPLIED" && app.status !== "ACCEPTED") {
    return "stale";
  }
  // A terminal shift state always blocks withdrawal — it must never reopen
  // a COMPLETED or CLOSED shift through self-service.
  if (shift.status === "COMPLETED" || shift.status === "CLOSED") {
    return "committed";
  }
  if (!["OPEN", "FILLED"].includes(shift.status)) return "stale";
  if (!beforeCall(shift, now)) return app.status === "ACCEPTED" ? "committed" : "stale";
  return "allowed";
}
