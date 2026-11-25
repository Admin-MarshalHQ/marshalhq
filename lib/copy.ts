// Canonical copy for concepts that are rendered in more than one place. Put
// strings here when both the manager and the marshal see them (or when the
// same phrase appears on several pages), so they don't drift apart over time.
// State labels live in lib/state.ts. Validation/field messages live in
// lib/zod.ts. This file is only for shared UI prose.

// --- Contact release invariant ---------------------------------------------
// Contact details are visible only to the accepted manager/marshal pair. The
// manager booking page and the marshal application page both render these on
// the "released" card, so the user sees the same language from both sides.
export const CONTACT_RELEASED_HEADING = "Contact released";

export const CONTACT_RELEASED_BODY_MANAGER =
  "Shared only with you and the booked marshal. Please use it only for this booking.";

export const CONTACT_RELEASED_BODY_MARSHAL =
  "Shared only with you and this manager. Please use it only for this booking.";

// --- Stale-session flashes -------------------------------------------------
// When a manager clicks Accept or Reject on a page rendered before another
// action changed the state (e.g. the shift was already filled in another tab),
// the server action redirects back with a flash query param so the user sees a
// friendly explanation instead of a crash.
export const FLASH_APPLICATION_NO_LONGER_ACTIONABLE =
  "This application can no longer be acted on \u2014 the shift or application state has changed. The page has been refreshed with the current state.";

// --- Destructive action confirmations --------------------------------------
// Every confirmation explains the consequence in plain language. Keep these
// calm and operational; avoid punitive or dramatic phrasing. Reuse across
// places where the same action exists (manager shift detail vs. applicant
// detail both surface Accept, for example).
export const CONFIRM_ACCEPT_TITLE = "Accept and book this marshal?";
export function confirmAcceptBody(booked: number, needed: number) {
  const projected = booked + 1;
  const remaining = needed - projected;
  const availability = remaining === 0
    ? "The shift will be filled."
    : remaining === 1
      ? "One place will remain open."
      : `${remaining} places will remain open.`;

  return `This will book ${projected} of ${needed} places. ${availability} Contact details will be shared between you and this marshal.`;
}
export const CONFIRM_ACCEPT_ACTION = "Accept and book";

export const CONFIRM_REJECT_TITLE = "Reject this applicant?";
export const CONFIRM_REJECT_BODY =
  "This applicant will no longer be considered for the shift. They will be notified of the outcome.";
export const CONFIRM_REJECT_ACTION = "Reject applicant";

export const CONFIRM_CLOSE_OPEN_TITLE = "Close this shift?";
export const CONFIRM_CLOSE_OPEN_BODY =
  "The shift will stop accepting applications. Any pending applicants will be rejected and notified.";
export const CONFIRM_CLOSE_OPEN_ACTION = "Close shift";

export const CONFIRM_CLOSE_DRAFT_TITLE = "Abandon this draft?";
export const CONFIRM_CLOSE_DRAFT_BODY =
  "The shift will be closed and cannot be published. It has no applicants, so nobody is affected.";
export const CONFIRM_CLOSE_DRAFT_ACTION = "Abandon draft";

export const CONFIRM_CANCEL_FILLED_TITLE = "Cancel this booked shift?";
export const CONFIRM_CANCEL_FILLED_BODY =
  "The booked marshal will be notified the shift is cancelled and their booking will be withdrawn. The shift will be closed.";
export const CONFIRM_CANCEL_FILLED_ACTION = "Cancel shift";

export const CONFIRM_COMPLETE_RELIABLE_TITLE = "Mark this shift complete?";
export const CONFIRM_COMPLETE_RELIABLE_BODY =
  "The marshal will be credited with a completed, reliable shift on their Setru history. This cannot be undone.";
export const CONFIRM_COMPLETE_RELIABLE_ACTION = "Confirm complete";

export const CONFIRM_COMPLETE_FLAG_TITLE = "Flag a reliability issue?";
export const CONFIRM_COMPLETE_FLAG_BODY =
  "The shift will be marked complete but without a reliability credit. This will affect the marshal\u2019s reliability record. This cannot be undone.";
export const CONFIRM_COMPLETE_FLAG_ACTION = "Flag and complete";

export const CONFIRM_REVERT_TITLE = "Revert this shift to Draft?";
export const CONFIRM_REVERT_BODY =
  "The shift will stop accepting applications and go back to Draft. You can edit and republish it later.";
export const CONFIRM_REVERT_ACTION = "Revert to draft";

export const CONFIRM_REOPEN_TITLE = "Reopen this shift?";
export const CONFIRM_REOPEN_BODY =
  "One booked marshal will be withdrawn and the shift will return to Open for the missing slot. Use this when a marshal has dropped out.";
export const CONFIRM_REOPEN_ACTION = "Reopen shift";

export const CONFIRM_PUBLISH_TITLE = "Publish this shift?";
export const CONFIRM_PUBLISH_BODY =
  "The shift will become Open and visible to marshals. You can revert it to Draft later if nobody has applied yet.";
export const CONFIRM_PUBLISH_ACTION = "Publish";

export const CONFIRM_WITHDRAW_TITLE = "Withdraw this application?";
export const CONFIRM_WITHDRAW_BODY =
  "The manager will no longer be able to book you from this application.";
export const CONFIRM_WITHDRAW_ACTION = "Withdraw";

export const CONFIRM_DROPOUT_TITLE = "Drop out of this booking?";
export const CONFIRM_DROPOUT_BODY =
  "The manager will be notified and the shift will reopen for other marshals. Please only drop out if you genuinely cannot make the shift.";
export const CONFIRM_DROPOUT_ACTION = "Drop out";

// --- Revert-to-draft safety ------------------------------------------------
// Managers try to revert a published shift; if there are live applicants we
// refuse, because otherwise the marshals would be silently rejected behind the
// scenes. The copy tells the manager what to do instead.
export const REVERT_BLOCKED_TITLE = "Can\u2019t revert this shift to Draft";
export const REVERT_BLOCKED_BODY =
  "Applications already refer to these terms. Close this listing and post a new shift for revised dates, location or pay.";

// --- Apply gating ----------------------------------------------------------
// A marshal marked Unavailable can't apply until they update their profile.
// A marshal marked Open to work ("limited availability") can apply, but we
// nudge them to commit before they submit.
export const APPLY_BLOCKED_UNAVAILABLE_TITLE =
  "Your availability is set to Not currently available";
export const APPLY_BLOCKED_UNAVAILABLE_BODY =
  "Update your profile availability to apply for shifts. Only apply once you\u2019re genuinely free — contact release depends on trust.";

export const APPLY_LIMITED_REMINDER =
  "Your availability is set to Open to work. Please only apply if you can commit to this shift — the manager is relying on you to show up.";

// --- Booking-conflict gating -------------------------------------------------
// A shift that overlaps a booking the marshal is already ACCEPTED on is a hard
// block: accepting both would guarantee a no-show for one manager. A shift
// that overlaps dates the marshal marked unavailable is a soft reminder only —
// their calendar is self-reported and they may know better.
export const APPLY_BLOCKED_BOOKED_TITLE =
  "You’re already booked on these dates";
export const APPLY_BLOCKED_BOOKED_BODY =
  "This shift overlaps a booking you’ve already been accepted on. A manager is relying on you for those dates. If your plans have changed, withdraw from the other booking first.";

export const APPLY_UNAVAILABLE_DATES_REMINDER =
  "You’ve marked yourself unavailable during these dates. You can still apply, but only do so if you’re genuinely free — the manager is relying on you to show up.";

export const WAITLIST_NEXT_STEP =
  "We’ll send one update when private beta places open for your role.";

export function notificationInboxText(notice: { kind: string; subject: string; body: string; link: string | null }) {
  if (notice.kind === "SHIFT_STATUS_CHANGED" && notice.subject.startsWith("Remaining calls released:")) {
    return { subject: "Call release recorded", body: "A release was recorded for this booking. Open its current record for the dates and any subsequent correction or dispute." };
  }
  if (notice.kind === "APPLICATION_SUBMITTED" && !notice.link) {
    return { subject: "Application submitted", body: "An earlier application was recorded. Check your workspace for its current status." };
  }
  return { subject: notice.subject, body: notificationDisplayBody(notice.kind, notice.body) };
}

// Previously stored messages keep their original content in the database.
export function notificationDisplayBody(kind: string, body: string) {
  if (kind === "REVIEW_RECEIVED") return "A review was submitted for this shift.";
  if (kind === "SHIFT_STATUS_CHANGED" && body.startsWith("Recorded outcome:")) return "An attendance update was recorded. Open your booking for the current outcome.";
  const legacyEnding =
    kind === "SHIFT_STATUS_CHANGED"
        ? "If you have questions about this cancellation, contact MarshalHQ support and we’ll follow up."
        : undefined;

  if (!legacyEnding || !body.endsWith(legacyEnding)) return body;
  return body.slice(0, -legacyEnding.length) + legacyEnding.replace("MarshalHQ", "Setru");
}
