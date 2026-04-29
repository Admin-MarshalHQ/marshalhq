import { z } from "zod";
import { normalisePhone, PHONE_INVALID_MESSAGE } from "./phone";
import { CONTACT_LEAK_MESSAGE, detectContactLeak } from "./contact-detect";

// Phone input is normalised to stored form at the schema boundary so downstream
// code sees one canonical shape. Any non-UK or unrecognisable number is rejected
// with the same user-facing message.
const phoneField = z
  .string()
  .trim()
  .min(1, "Enter a phone number")
  .transform((v) => normalisePhone(v))
  .refine((v): v is string => v !== null, {
    message: PHONE_INVALID_MESSAGE,
  });

// Reject free-text fields that contain contact details or contact-seeking
// instructions. Used on every pre-acceptance visible field so a manager or
// marshal can't slip an email/phone/social handle into a shift description,
// cover note, or profile summary. Support requests intentionally do not use
// this — they're founder-facing, and we need users to be able to send their
// own contact details in a support ticket.
const noContactLeak = (schema: z.ZodString) =>
  schema.refine((v) => detectContactLeak(v).ok, {
    message: CONTACT_LEAK_MESSAGE,
  });

const optionalNoContactLeak = (schema: z.ZodString) =>
  z
    .union([
      schema.refine((v) => detectContactLeak(v).ok, {
        message: CONTACT_LEAK_MESSAGE,
      }),
      z.literal(""),
    ])
    .optional();

export const SignupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, "Use at least 8 characters"),
    phone: phoneField,
    role: z.enum(["MANAGER", "MARSHAL"]),
    // Company and display name appear on every shift card a marshal sees
    // before acceptance, so they get the contact-leak guard too.
    companyName: optionalNoContactLeak(z.string().trim().max(120)),
    displayName: optionalNoContactLeak(z.string().trim().max(120)),
    // Presence-only validation — the actual env-match comparison happens in
    // signupAction so we never leak length/shape/role-binding via Zod errors.
    pilotCode: z.string().trim().min(1, "Pilot code is required"),
  })
  .refine(
    (v) =>
      v.role !== "MANAGER" || (!!v.companyName && !!v.displayName),
    {
      message: "Company and your name are required for manager accounts",
      path: ["companyName"],
    },
  );

export const ShiftDraftSchema = z
  .object({
    productionName: noContactLeak(z.string().trim().min(1, "Required").max(140)),
    location: noContactLeak(z.string().trim().min(1, "Required").max(200)),
    // A shift posts as a single block: startDate..endDate (inclusive), with
    // the same daily window each day. One-day shifts pass the same value for
    // both dates.
    startDate: z.string().min(1, "Required"),
    endDate: z.string().min(1, "Required"),
    dailyStartTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
    dailyEndTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
    rate: z.coerce.number().positive("Rate must be positive"),
    rateUnit: z.enum(["HOUR", "DAY"]),
    duties: noContactLeak(
      z.string().trim().min(1, "Describe the duties").max(2000),
    ),
    parkingTravel: optionalNoContactLeak(z.string().trim().max(500)),
    experienceNotes: optionalNoContactLeak(z.string().trim().max(500)),
  })
  .superRefine((v, ctx) => {
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end.getTime() < start.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date can’t be before start date",
      });
    }
    if (v.dailyEndTime <= v.dailyStartTime) {
      ctx.addIssue({
        code: "custom",
        path: ["dailyEndTime"],
        message: "End time must be after start time",
      });
    }
  });

export const MarshalProfileSchema = z.object({
  fullName: noContactLeak(z.string().trim().min(1, "Required").max(120)),
  baseLocation: noContactLeak(z.string().trim().min(1, "Required").max(120)),
  travelRadiusMiles: z.coerce.number().int().min(0).max(500),
  experienceSummary: noContactLeak(
    z
      .string()
      .trim()
      .min(10, "A short summary helps managers decide")
      .max(2000),
  ),
  availability: z.enum(["ACTIVELY_LOOKING", "OPEN_TO_WORK", "UNAVAILABLE"]),
  hasTransport: z
    .union([z.literal("true"), z.literal("false"), z.literal(""), z.undefined()])
    .optional(),
  hasDriversLicence: z
    .union([z.literal("true"), z.literal("false"), z.literal(""), z.undefined()])
    .optional(),
  training: optionalNoContactLeak(z.string().trim().max(500)),
  photoUrl: z
    .string()
    .trim()
    .url("Must be a URL")
    .optional()
    .or(z.literal("")),
});

export const ApplySchema = z.object({
  shiftId: z.string().min(1),
  coverNote: optionalNoContactLeak(z.string().trim().max(1000)),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8, "Use at least 8 characters"),
});

export const SupportRequestSchema = z.object({
  // For logged-out submitters; logged-in users have this prefilled server-side.
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.enum([
    "ACCOUNT_ACCESS",
    "SHIFT_ISSUE",
    "APPLICATION_ISSUE",
    "CONTACT_BOOKING",
    "PROFILE_ISSUE",
    "PRIVACY_DELETION",
    "TRUST_SAFETY",
    "OTHER",
  ]),
  message: z
    .string()
    .trim()
    .min(10, "Tell us what's happening so we can help")
    .max(4000),
});

export const FounderNoteSchema = z.object({
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

// Early access waitlist intake. Public form with no auth — every field is
// validated server-side here. The contact-leak guard on `note` keeps the
// usual pre-acceptance hygiene applied to free text.
export const WaitlistEntrySchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    role: z.enum(["MANAGER", "MARSHAL"], {
      errorMap: () => ({ message: "Choose manager or marshal" }),
    }),
    location: z
      .string()
      .trim()
      .min(1, "Enter your base area")
      .max(120),
    note: noContactLeak(
      z
        .string()
        .trim()
        .min(10, "Tell us a bit about your interest")
        .max(1000),
    ),
    // HTML checkbox sends "on" when checked, nothing when not. Anything else
    // is treated as missing consent and rejected.
    consentToContact: z.literal("on", {
      errorMap: () => ({
        message: "Please confirm consent to be contacted",
      }),
    }),
    managerRole: z
      .union([
        z.string().trim().max(120),
        z.literal(""),
      ])
      .optional(),
    expectedNeed: z
      .union([
        z.enum(["URGENT", "OCCASIONAL", "REGULAR", "FUTURE_PROJECT"]),
        z.literal(""),
      ])
      .optional(),
    marshalExperience: z
      .union([
        z.enum(["NEW", "SOME", "EXPERIENCED"]),
        z.literal(""),
      ])
      .optional(),
    availability: z
      .union([
        z.enum(["AVAILABLE_NOW", "AVAILABLE_SOON", "FUTURE_INTEREST"]),
        z.literal(""),
      ])
      .optional(),
  })
  // Manager-only fields are rejected for marshal submissions and vice versa,
  // so a tampered payload can't smuggle the wrong role's data into storage.
  .superRefine((v, ctx) => {
    if (v.role === "MANAGER") {
      if (v.marshalExperience) {
        ctx.addIssue({
          code: "custom",
          path: ["marshalExperience"],
          message: "Not allowed for managers",
        });
      }
      if (v.availability) {
        ctx.addIssue({
          code: "custom",
          path: ["availability"],
          message: "Not allowed for managers",
        });
      }
    } else {
      if (v.managerRole) {
        ctx.addIssue({
          code: "custom",
          path: ["managerRole"],
          message: "Not allowed for marshals",
        });
      }
      if (v.expectedNeed) {
        ctx.addIssue({
          code: "custom",
          path: ["expectedNeed"],
          message: "Not allowed for marshals",
        });
      }
    }
  });
