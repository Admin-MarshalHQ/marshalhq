import type {
  ApplicationStatus,
  Availability,
  ShiftStatus,
} from "@/lib/types";

export const SHIFT_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  DRAFT: ["OPEN", "CLOSED"],
  OPEN: ["DRAFT", "FILLED", "CLOSED"],
  FILLED: ["COMPLETED", "OPEN", "CLOSED"],
  CLOSED: [],
  COMPLETED: [],
};

export const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  APPLIED: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: ["WITHDRAWN"],
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
// once its scheduled end time has passed. Kept pure so the UI can disable the
// "Complete" control ahead of time and tests can assert without touching the DB.
export type CompletableShift = {
  date: Date;
  endTime: string; // "HH:MM"
  status: string;
};

export function canCompleteShift(
  shift: CompletableShift,
  now: Date = new Date(),
): boolean {
  if (shift.status !== "FILLED") return false;
  const end = new Date(shift.date);
  const [h, m] = shift.endTime.split(":").map(Number);
  end.setHours(h ?? 0, m ?? 0, 0, 0);
  return end.getTime() <= now.getTime();
}

/**
 * Combine a shift's `date` (date-only) with its `startTime` ("HH:MM") into a
 * real Date. Used by the publish and apply guards: a shift whose start is in
 * the past must not be publishable and must not accept applications, because
 * the trust promise that OPEN means "live, actionable, and safe to apply to"
 * breaks otherwise.
 */
export function shiftStartDateTime(date: Date, startTime: string): Date {
  const start = new Date(date);
  const [h, m] = startTime.split(":").map(Number);
  start.setHours(h ?? 0, m ?? 0, 0, 0);
  return start;
}

/**
 * True if the shift is safe to publish or apply to on temporal grounds. The
 * start must be strictly in the future, and the end must be after the start
 * (same-day shifts only — overnight is out of scope for the MVP and would
 * need a separate end-date field to represent safely).
 */
export function isShiftSchedulable(
  shift: { date: Date; startTime: string; endTime: string },
  now: Date = new Date(),
): boolean {
  if (shift.endTime <= shift.startTime) return false;
  const start = shiftStartDateTime(shift.date, shift.startTime);
  return start.getTime() > now.getTime();
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
  WITHDRAWN: "Withdrawn",
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
    date: Date;
    startTime: string;
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
  if (app.status === "APPLIED") {
    // APPLIED is only withdrawable while the shift is still OPEN. Anything
    // else means the shift moved on (FILLED, paused, etc.) without this row
    // catching the update — surface as stale and let the page refresh.
    return shift.status === "OPEN" ? "allowed" : "stale";
  }
  // ACCEPTED branch: the shift must still be FILLED (we are the booked
  // marshal) and must not have started yet.
  if (shift.status !== "FILLED") return "stale";
  const start = shiftStartDateTime(shift.date, shift.startTime);
  if (start.getTime() <= now.getTime()) return "committed";
  return "allowed";
}
