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
export const CONFIRM_ACCEPT_BODY =
  "This applicant will be accepted and the shift will become Filled. Any other active applicants will be rejected. Contact details will be released to you and this marshal only.";
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
  "The marshal will be credited with a completed, reliable shift on their MarshalHQ history. This cannot be undone.";
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
  "The booked marshal\u2019s booking will be withdrawn and the shift will return to Open for new applications. Use this when the marshal has dropped out.";
export const CONFIRM_REOPEN_ACTION = "Reopen shift";

export const CONFIRM_PUBLISH_TITLE = "Publish this shift?";
export const CONFIRM_PUBLISH_BODY =
  "The shift will become Open and visible to marshals. You can revert it to Draft later if nobody has applied yet.";
export const CONFIRM_PUBLISH_ACTION = "Publish";

export const CONFIRM_WITHDRAW_TITLE = "Withdraw this application?";
export const CONFIRM_WITHDRAW_BODY =
  "Your application will be pulled. You can apply again while the shift is still Open.";
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
  "This shift has active applicants. Reverting would silently reject them. If you no longer want to hire, close the shift instead so applicants receive a proper outcome.";

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
