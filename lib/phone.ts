// UK phone handling for MarshalHQ.
//
// Storage format is E.164-ish ("+44" followed by 10 digits, no spaces) so every
// row on disk looks the same regardless of how the user typed it. Display format
// groups digits for readability after contact release. Validation is deliberately
// permissive about separators (spaces, dashes, parentheses) but strict about the
// resulting UK number.

export type NormalisedPhone = string; // "+44" + 10 digits

const STORED_FORMAT = /^\+44\d{10}$/;

/**
 * Try to coerce a user-supplied UK phone number into stored format.
 * Returns null when the input isn't recognisable as a UK phone.
 *
 * Accepts:
 *   07911 123 456
 *   07911123456
 *   +44 7911 123 456
 *   +447911123456
 *   (020) 7946 0958
 *   0044 20 7946 0958
 *   44 20 7946 0958
 */
export function normalisePhone(input: string | null | undefined): NormalisedPhone | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Drop every character that isn't a digit or leading plus.
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  let rest: string;
  if (cleaned.startsWith("+44")) {
    rest = cleaned.slice(3).replace(/^0+/, "");
  } else if (cleaned.startsWith("0044")) {
    rest = cleaned.slice(4).replace(/^0+/, "");
  } else if (cleaned.startsWith("44") && !cleaned.startsWith("+")) {
    // Bare 44 prefix — accept only when the remainder looks like a full UK number
    // (10 digits after dropping any stray trunk zero).
    const candidate = cleaned.slice(2).replace(/^0+/, "");
    if (candidate.length !== 10) return null;
    rest = candidate;
  } else if (cleaned.startsWith("0")) {
    rest = cleaned.slice(1);
  } else {
    return null;
  }

  if (!/^\d{10}$/.test(rest)) return null;
  return `+44${rest}`;
}

export function isValidUKPhone(input: string | null | undefined): boolean {
  return normalisePhone(input) !== null;
}

/**
 * Display format for contact-release screens. Groups digits so the number is
 * easy to read and copy. Never invents digits; if input isn't the canonical
 * stored shape, tries to normalise first, and falls back to the raw string.
 */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return "\u2014";
  const canonical = STORED_FORMAT.test(stored) ? stored : normalisePhone(stored);
  if (!canonical) return stored; // best effort — show whatever is on record

  const rest = canonical.slice(3); // 10 digits
  if (rest.startsWith("7")) {
    // UK mobile: +44 7XXX XXX XXX
    return `+44 ${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`;
  }
  if (rest.startsWith("20") || rest.startsWith("23") || rest.startsWith("24") || rest.startsWith("28") || rest.startsWith("29")) {
    // 2-digit area code geographic numbers (London, Southampton, Cardiff, NI, etc.)
    return `+44 ${rest.slice(0, 2)} ${rest.slice(2, 6)} ${rest.slice(6)}`;
  }
  if (rest.startsWith("11") || rest.startsWith("12") || rest.startsWith("13") || rest.startsWith("14") || rest.startsWith("15") || rest.startsWith("16") || rest.startsWith("17") || rest.startsWith("18") || rest.startsWith("19")) {
    // 3-digit area code geographic numbers.
    return `+44 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  // Non-geographic (3/8/9 prefixes) — generic 4-3-3 grouping.
  return `+44 ${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`;
}

/**
 * Zod refine helper: accept any input that normalises successfully, and let the
 * caller map through `normalisePhone` before storage.
 */
export const PHONE_INVALID_MESSAGE =
  "Enter a UK phone number, e.g. 07911 123456 or +44 20 7946 0958";
