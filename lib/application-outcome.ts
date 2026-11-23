const outcomes = {
  received: {
    label: "Application received",
    tone: "accent",
    detail: "The manager can review your application. Check here for the outcome.",
  },
  paused: {
    label: "Application received",
    tone: "accent",
    detail: "Hiring for this shift is paused. Check here for updates.",
  },
  booked: {
    label: "Booked",
    tone: "ok",
    detail: "Your place is confirmed. Open the booking for shift details.",
  },
  filled: {
    label: "Shift filled",
    tone: "booked",
    detail: "Your application can be reviewed again if a place reopens.",
  },
  completed: {
    label: "Completed",
    tone: "ok",
    detail: "The manager marked your shift complete. It appears in your work history.",
  },
  shiftCompleted: {
    label: "Shift completed",
    tone: "neutral",
    detail: "The shift has ended. You were not booked.",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
    detail: "The manager did not accept your application.",
  },
  withdrawn: {
    label: "Withdrawn",
    tone: "neutral",
    detail: "This application is no longer active.",
  },
  cancelled: {
    label: "Booking cancelled",
    tone: "neutral",
    detail: "The shift is closed. You are no longer booked.",
  },
  closed: {
    label: "Shift closed",
    tone: "neutral",
    detail: "This shift is closed and you have no active booking.",
  },
  unavailable: {
    label: "Shift unavailable",
    tone: "neutral",
    detail: "This shift is currently unavailable. Check here for updates.",
  },
} as const;

export function marshalApplicationOutcome(
  status: string,
  shift: { status: string; paused: boolean },
  attendance?: string | null,
) {
  // Closing a shift stores cancellations as WITHDRAWN and pending closures
  // as REJECTED. Those same states can predate a closure, so use the known
  // shift outcome without attributing an action to the marshal or manager.
  if (shift.status === "CLOSED") {
    return status === "ACCEPTED" ? outcomes.cancelled : outcomes.closed;
  }
  if (status === "REJECTED") return outcomes.rejected;
  if (status === "WITHDRAWN") return outcomes.withdrawn;
  if (shift.status === "COMPLETED") {
    if (attendance === "UNRESOLVED") return { label: "Attendance under review", tone: "neutral", detail: "Contact support about your booking. Work history is pending." } as const;
    if (attendance === "NOT_WORKED") return { label: "Did not work", tone: "neutral", detail: "This booking has no completion credit. Contact support if this is incorrect." } as const;
    return status === "ACCEPTED" ? outcomes.completed : outcomes.shiftCompleted;
  }
  if (shift.status === "OPEN" || shift.status === "FILLED") {
    if (status === "ACCEPTED") return outcomes.booked;
    if (status === "APPLIED") {
      if (shift.status === "FILLED") return outcomes.filled;
      return shift.paused ? outcomes.paused : outcomes.received;
    }
  }
  return outcomes.unavailable;
}
