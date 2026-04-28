// Domain enums. Kept as TS unions because SQLite storage is string-typed.
// Every place that writes these values must go through Zod at the edge.

export type Role = "MANAGER" | "MARSHAL" | "UNSET";
export type Availability =
  | "ACTIVELY_LOOKING"
  | "OPEN_TO_WORK"
  | "UNAVAILABLE";
export type RateUnit = "HOUR" | "DAY";
export type ShiftStatus =
  | "DRAFT"
  | "OPEN"
  | "FILLED"
  | "CLOSED"
  | "COMPLETED";
export type ApplicationStatus =
  | "APPLIED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";
export type NotificationKind =
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_ACCEPTED"
  | "APPLICATION_REJECTED"
  | "SHIFT_STATUS_CHANGED"
  | "PASSWORD_RESET"
  | "SUPPORT_CONFIRMATION";

// Support and privacy intake categories. Founder handles each manually. The
// PRIVACY_DELETION option routes to the manual deletion review path and must
// never trigger an automated hard delete.
export type SupportCategory =
  | "ACCOUNT_ACCESS"
  | "SHIFT_ISSUE"
  | "APPLICATION_ISSUE"
  | "CONTACT_BOOKING"
  | "PROFILE_ISSUE"
  | "PRIVACY_DELETION"
  | "TRUST_SAFETY"
  | "OTHER";

export const SUPPORT_CATEGORY_LABEL: Record<SupportCategory, string> = {
  ACCOUNT_ACCESS: "Account access",
  SHIFT_ISSUE: "Shift issue",
  APPLICATION_ISSUE: "Application issue",
  CONTACT_BOOKING: "Contact or booking issue",
  PROFILE_ISSUE: "Profile issue",
  PRIVACY_DELETION: "Privacy or account deletion request",
  TRUST_SAFETY: "Trust or safety concern",
  OTHER: "Other",
};

// Early access waitlist — demand capture only. These intentionally do NOT
// reuse the Role / Availability unions above: the waitlist captures interest
// before any account exists, so it has its own narrow vocabulary.
export type WaitlistRole = "MANAGER" | "MARSHAL";
export type WaitlistStatus = "NEW" | "REVIEWED" | "CONTACTED" | "ARCHIVED";
export type WaitlistExpectedNeed =
  | "URGENT"
  | "OCCASIONAL"
  | "REGULAR"
  | "FUTURE_PROJECT";
export type WaitlistMarshalExperience = "NEW" | "SOME" | "EXPERIENCED";
export type WaitlistAvailability =
  | "AVAILABLE_NOW"
  | "AVAILABLE_SOON"
  | "FUTURE_INTEREST";

export const WAITLIST_ROLE_LABEL: Record<WaitlistRole, string> = {
  MANAGER: "Location manager",
  MARSHAL: "Location marshal",
};

export const WAITLIST_EXPECTED_NEED_LABEL: Record<
  WaitlistExpectedNeed,
  string
> = {
  URGENT: "Urgent — need cover soon",
  OCCASIONAL: "Occasional",
  REGULAR: "Regular",
  FUTURE_PROJECT: "Future project",
};

export const WAITLIST_MARSHAL_EXPERIENCE_LABEL: Record<
  WaitlistMarshalExperience,
  string
> = {
  NEW: "New to marshalling",
  SOME: "Some experience",
  EXPERIENCED: "Experienced location marshal",
};

export const WAITLIST_AVAILABILITY_LABEL: Record<WaitlistAvailability, string> =
  {
    AVAILABLE_NOW: "Available now",
    AVAILABLE_SOON: "Available within a few weeks",
    FUTURE_INTEREST: "Future interest",
  };

export const WAITLIST_STATUS_LABEL: Record<WaitlistStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  CONTACTED: "Contacted",
  ARCHIVED: "Archived",
};
