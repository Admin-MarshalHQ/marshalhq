// Contact-leakage detection for pre-acceptance free-text fields.
//
// The trust invariant is that contact details (email, phone, social handles)
// are exchanged only after a manager accepts a marshal. That promise breaks
// if either side slips a contact channel into a field the other side can see
// before acceptance — shift duties, cover notes, marshal experience summary,
// etc. This module is the shared backstop: anything going into one of those
// fields passes through here before hitting the database.
//
// Goals:
//   - run server-side (the client-side form may also use it, but we never
//     rely on that)
//   - block the obvious cases (emails, UK/international phone numbers, URLs,
//     WhatsApp/Telegram/social handles, explicit "call me / DM me" prompts)
//   - allow normal production language that happens to use words like
//     "phone", "email", "radio" without being a contact instruction
//   - tolerate false positives: the user sees calm edit guidance and can
//     revise. No silent rejection, no AI moderation.
//
// This is deliberately not a full moderation system. It catches the low bar
// and leaves everything else to the founder review flow.

const EMAIL_RE = /[a-z0-9._%+-]+\s*(?:@|\[at\]|\(at\))\s*[a-z0-9.-]+\s*(?:\.|\[dot\]|\(dot\))\s*[a-z]{2,}/i;

// Phone detector.
// Matches UK-style numbers (07…, +44…, 0044…, 020 …) and generic international
// runs of 9+ digits interspersed with spaces, dots, or hyphens. Kept slightly
// loose — a user typing "0203 4567 890" or "+44 7911 123 456" must be caught.
// Stray short numbers (rates, radii, call times) should not match.
const UK_PHONE_RE = /(?:\+?44|0044)\s*\(?\d{2,5}\)?[\s.\-]*\d{3,4}[\s.\-]*\d{3,4}/;
const UK_MOBILE_RE = /\b0?7\d{3}[\s.\-]?\d{3}[\s.\-]?\d{3}\b/;
const INTL_PHONE_RE = /\+\d{1,3}[\s.\-]*\d{2,4}[\s.\-]*\d{2,4}[\s.\-]*\d{2,4}\b/;
// Bare 9+ digit runs with separators, to catch "07911 123 456" without a
// country prefix.
const LONG_DIGIT_RUN_RE = /\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{3,5}\b/;

const URL_RE = /\b(?:https?:\/\/|www\.)[a-z0-9][a-z0-9.\-]+\.[a-z]{2,}[^\s]*/i;
// Domain-only leaks like "hit me at johns.co.uk" — require TLD and a "me"/"at"
// prompt nearby, to avoid clashing with legitimate production names.
const DOMAIN_LEAK_RE = /\b(?:reach|dm|message|contact|email|call|text|ping|whatsapp|hit)\s+(?:me|us)\s+(?:at|on|via)\s+[a-z0-9][a-z0-9.\-]+\.[a-z]{2,}/i;

// Social handles. @-handles are the clearest signal; we also catch "ig: name"
// and "snap: name" style introductions. Word boundaries on the prefix avoid
// false positives like "big:" or "was:" inside production text.
const AT_HANDLE_RE = /(?:^|[\s(,;:])@[a-z0-9_.]{3,}/i;
const SOCIAL_INTRO_RE = /\b(?:insta(?:gram)?|ig|snapchat|tiktok|telegram|whats\s*app|signal|messenger)\s*[:=]\s*@?[a-z0-9_.]{3,}/i;

// Contact-seeking prompts. These are phrased as imperatives directed at the
// reader: "call me", "dm me", "email me". A production brief that mentions
// "call time 06:00" or "radio channel" should not match.
const CONTACT_PROMPT_RE = /\b(?:call|text|ring|dm|message|ping|email|reach|contact|whats\s*app|telegram)\s+me\b/i;
const CONTACT_PROMPT_OFFSITE_RE = /\b(?:off\s*(?:line|platform)|outside\s+(?:the\s+)?(?:app|platform|site)|my\s+(?:mobile|cell|number|phone|line)\b|private(?:ly)?\s+(?:message|contact|dm))/i;

/**
 * Explanation of why the text was blocked. The UI can surface the reason code
 * if it wants, or just show the standard remediation copy.
 */
export type ContactLeakKind =
  | "email"
  | "phone"
  | "url"
  | "social_handle"
  | "contact_prompt";

export type ContactLeakResult =
  | { ok: true }
  | { ok: false; kind: ContactLeakKind };

export function detectContactLeak(raw: string | null | undefined): ContactLeakResult {
  if (!raw) return { ok: true };
  const text = String(raw);
  if (text.trim().length === 0) return { ok: true };
  // Normalise bracketed obfuscation so "john [at] example [dot] com" trips the
  // email rule. We intentionally don't collapse the plain words "at" / "dot"
  // because ordinary production text ("first aid at work", "Greenwich, SE10")
  // would sprout false positives. Plain-word contact prompts are caught by
  // the CONTACT_PROMPT regexes instead.
  const deObfuscated = text
    .replace(/\s*\[at\]\s*/gi, "@")
    .replace(/\s*\(at\)\s*/gi, "@")
    .replace(/\s*\[dot\]\s*/gi, ".")
    .replace(/\s*\(dot\)\s*/gi, ".");
  if (EMAIL_RE.test(deObfuscated) || EMAIL_RE.test(text)) {
    return { ok: false, kind: "email" };
  }
  if (
    UK_PHONE_RE.test(text) ||
    UK_MOBILE_RE.test(text) ||
    INTL_PHONE_RE.test(text) ||
    LONG_DIGIT_RUN_RE.test(text)
  ) {
    return { ok: false, kind: "phone" };
  }
  if (URL_RE.test(text) || DOMAIN_LEAK_RE.test(text)) {
    return { ok: false, kind: "url" };
  }
  if (AT_HANDLE_RE.test(text) || SOCIAL_INTRO_RE.test(text)) {
    return { ok: false, kind: "social_handle" };
  }
  if (CONTACT_PROMPT_RE.test(text) || CONTACT_PROMPT_OFFSITE_RE.test(text)) {
    return { ok: false, kind: "contact_prompt" };
  }
  return { ok: true };
}

/**
 * Calm user-facing edit guidance. Same copy for every kind — we do not want
 * this to become a guessing game where users learn exactly which pattern to
 * obfuscate. If a caller wants to tailor the prefix (e.g. "In your cover
 * note, ...") it can prepend that and still use this message.
 */
export const CONTACT_LEAK_MESSAGE =
  "Please remove contact details or contact instructions. Contact is only shared after a manager accepts an applicant.";

/**
 * Convenience: true if any of the provided fields triggers a leak. Caller
 * should use detectContactLeak directly when it needs to know which field
 * and which kind; this is for schema-level validation where a single boolean
 * is enough.
 */
export function hasContactLeak(
  ...values: Array<string | null | undefined>
): boolean {
  return values.some((v) => !detectContactLeak(v).ok);
}
