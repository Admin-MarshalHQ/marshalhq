// Pure-function tests for the External Audit Remediation Sprint.
//
// The existing `db:smoke` suite is the authoritative invariants check, but it
// requires a live database. This script runs the portions of the remediation
// that live in pure helpers (contact-detect, safeNextPath, isShiftSchedulable,
// isFounderEmail, reset token shape) so we can verify them locally without
// a DB.
//
// Run with:   npx tsx scripts/audit_remediation_tests.ts
//
// Every assertion is labelled with the audit finding it defends (A–J) so a
// failure tells the reader which audit item regressed.

import {
  detectContactLeak,
  hasContactLeak,
  CONTACT_LEAK_MESSAGE,
} from "../lib/contact-detect";
import { safeNextPath } from "../lib/redirect";
import {
  classifyWithdraw,
  isShiftSchedulable,
  canMarshalApply,
} from "../lib/state";
import {
  generateRawResetToken,
  hashResetToken,
} from "../lib/reset";

type Result = { pass: boolean; label: string };
const results: Result[] = [];

function check(cond: unknown, label: string) {
  const pass = !!cond;
  results.push({ pass, label });
  const mark = pass ? "\u2713" : "\u2717";
  console.log(`${mark} ${label}`);
}

// ---- A: Founder allowlist behaviour (without the network/DB side) ----------
// `isFounderEmail` reads FOUNDER_EMAILS on every call, so we can poke it via
// env mutation safely.
{
  const original = process.env.FOUNDER_EMAILS;
  process.env.FOUNDER_EMAILS = "founder@marshalhq.com,second@marshalhq.com";
  const access =
    require("../lib/access") as typeof import("../lib/access");
  const { isFounderEmail, isReservedSignupEmail } = access;
  check(
    isFounderEmail("founder@marshalhq.com"),
    "A: founder email matches exactly",
  );
  check(
    isFounderEmail("FOUNDER@MarshalHQ.com"),
    "A: founder email match is case-insensitive",
  );
  check(
    isFounderEmail("second@marshalhq.com"),
    "A: secondary founder email matches from comma-separated list",
  );
  check(
    !isFounderEmail("attacker@marshalhq.com"),
    "A: unrelated email is not a founder email",
  );
  check(
    !isFounderEmail(null) && !isFounderEmail(undefined) && !isFounderEmail(""),
    "A: empty/null/undefined inputs are not founder emails",
  );
  process.env.FOUNDER_EMAILS = "";
  check(
    !isFounderEmail("founder@marshalhq.com"),
    "A: unset FOUNDER_EMAILS means no emails are founders",
  );
  // Defence-in-depth: even with FOUNDER_EMAILS empty, the signup blockade
  // must still refuse the hardcoded reserved addresses. This is the regression
  // that the manual QA failure exposed: deployed env had FOUNDER_EMAILS unset,
  // so `isFounderEmail` returned false and signup let founder-style addresses
  // through. `isReservedSignupEmail` decouples the signup blockade from the
  // env list so an env mistake can never re-open the hole.
  check(
    isReservedSignupEmail("founder@marshalhq.com"),
    "A: reserved signup blockade catches founder@ even with empty FOUNDER_EMAILS",
  );
  check(
    isReservedSignupEmail("FOUNDER@MarshalHQ.com"),
    "A: reserved signup blockade is case-insensitive",
  );
  check(
    isReservedSignupEmail("admin@marshalhq.com"),
    "A: reserved signup blockade catches admin@ as well",
  );
  check(
    isReservedSignupEmail("support@marshalhq.com"),
    "A: reserved signup blockade catches support@ as well",
  );
  check(
    !isReservedSignupEmail("real.user@example.com"),
    "A: reserved signup blockade lets ordinary user emails through",
  );
  check(
    !isReservedSignupEmail(null) &&
      !isReservedSignupEmail(undefined) &&
      !isReservedSignupEmail(""),
    "A: empty/null/undefined inputs are not reserved",
  );
  // When FOUNDER_EMAILS is set, isReservedSignupEmail catches both the
  // hardcoded list and the env list.
  process.env.FOUNDER_EMAILS = "extra.founder@marshalhq.com";
  check(
    isReservedSignupEmail("extra.founder@marshalhq.com"),
    "A: reserved signup blockade also catches env-listed founders",
  );
  check(
    isReservedSignupEmail("founder@marshalhq.com"),
    "A: reserved signup blockade still catches hardcoded reserved addresses when env is set",
  );
  process.env.FOUNDER_EMAILS = original;
}

// ---- B: Contact-leak detection --------------------------------------------
check(
  detectContactLeak("Happy to cover the full day, familiar with the area.").ok,
  "B: neutral cover-note text is allowed",
);
check(
  !detectContactLeak("Reach me on 07911 123 456 for quickest reply").ok,
  "B: UK mobile number (07-prefix) is blocked",
);
check(
  !detectContactLeak("Call me on +44 20 7946 0958").ok,
  "B: UK landline with +44 is blocked",
);
check(
  !detectContactLeak("Email me at john@example.com").ok,
  "B: plain email address is blocked",
);
check(
  !detectContactLeak("john [at] example [dot] com").ok,
  "B: bracketed email obfuscation is blocked",
);
check(
  !detectContactLeak("john (at) example (dot) co.uk").ok,
  "B: parenthesised email obfuscation is blocked",
);
check(
  !detectContactLeak("Come see https://example.com/me").ok,
  "B: https URL is blocked",
);
check(
  !detectContactLeak("Grab the brief at www.example.com").ok,
  "B: www URL is blocked",
);
check(
  !detectContactLeak("WhatsApp me tonight").ok,
  "B: WhatsApp contact prompt is blocked",
);
check(
  !detectContactLeak("Telegram me if needed").ok,
  "B: Telegram contact prompt is blocked",
);
check(
  !detectContactLeak("DM me on IG: example_name").ok,
  "B: 'IG:' handle is blocked",
);
check(
  !detectContactLeak("Insta: @example").ok,
  "B: Insta handle intro is blocked",
);
check(
  !detectContactLeak("Call me later").ok,
  "B: 'call me' prompt is blocked",
);
check(
  !detectContactLeak("Text me if plans change").ok,
  "B: 'text me' prompt is blocked",
);
check(
  !detectContactLeak("DM me").ok,
  "B: 'DM me' prompt is blocked",
);
check(
  !detectContactLeak("Reach me on my mobile").ok,
  "B: 'my mobile' contact prompt is blocked",
);
check(
  !detectContactLeak("Let's talk offline").ok,
  "B: 'offline' prompt is blocked",
);
check(
  detectContactLeak("6 years location marshal, NRSWA chapter 8, first aid at work").ok,
  "B: training/experience text with 'at work' is allowed (no plain-word at/dot expansion)",
);
check(
  detectContactLeak("Call time 06:00, radio channel 7, 15-minute drive").ok,
  "B: production shorthand (call time, radio channel) is allowed",
);
check(
  detectContactLeak("Nearest tube: Whitechapel, unit base on Martello Street").ok,
  "B: station/colon wording is not matched as social handle",
);
check(
  detectContactLeak("Short takes, big crew, outdoor").ok,
  "B: 'big' doesn't trigger ig-handle false positive",
);
check(
  detectContactLeak(null).ok && detectContactLeak(undefined as unknown as string).ok && detectContactLeak("").ok,
  "B: null/undefined/empty inputs pass through cleanly",
);
check(
  hasContactLeak("ok", "reach me on 07911 123456") === true,
  "B: hasContactLeak flags when any field leaks",
);
check(
  hasContactLeak("ok", "also ok") === false,
  "B: hasContactLeak returns false when no field leaks",
);
check(
  typeof CONTACT_LEAK_MESSAGE === "string" && CONTACT_LEAK_MESSAGE.length > 0,
  "B: CONTACT_LEAK_MESSAGE is exported and non-empty",
);

// ---- D + G: Withdraw classification ---------------------------------------
// `classifyWithdraw` is the single rule that drives the marshal-side
// withdraw flow. Every combination that the action used to handle through
// nested ifs lands here so a regression in any one of them shows up as a
// failure with a clear label.
{
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Allowed cases — the only two paths into a successful withdrawal.
  check(
    classifyWithdraw(
      { status: "APPLIED" },
      { status: "OPEN", date: futureDate, startTime: "07:00" },
    ) === "allowed",
    "D: APPLIED + OPEN shift in the future is allowed to withdraw",
  );
  check(
    classifyWithdraw(
      { status: "ACCEPTED" },
      { status: "FILLED", date: futureDate, startTime: "07:00" },
    ) === "allowed",
    "D: ACCEPTED + FILLED shift before start is allowed to withdraw (reopens shift)",
  );

  // Committed cases — operational commitment has passed; route to support.
  check(
    classifyWithdraw(
      { status: "ACCEPTED" },
      { status: "FILLED", date: pastDate, startTime: "07:00" },
    ) === "committed",
    "D: ACCEPTED + FILLED shift after start is blocked (committed)",
  );
  check(
    classifyWithdraw(
      { status: "ACCEPTED" },
      { status: "COMPLETED", date: pastDate, startTime: "07:00" },
    ) === "committed",
    "G: ACCEPTED on a COMPLETED shift cannot reopen via withdrawal",
  );
  check(
    classifyWithdraw(
      { status: "ACCEPTED" },
      { status: "CLOSED", date: pastDate, startTime: "07:00" },
    ) === "committed",
    "G: ACCEPTED on a CLOSED shift cannot reopen via withdrawal",
  );
  check(
    classifyWithdraw(
      { status: "APPLIED" },
      { status: "COMPLETED", date: pastDate, startTime: "07:00" },
    ) === "committed",
    "G: APPLIED on a COMPLETED shift is blocked (committed) so completion history is safe",
  );
  check(
    classifyWithdraw(
      { status: "APPLIED" },
      { status: "CLOSED", date: pastDate, startTime: "07:00" },
    ) === "committed",
    "G: APPLIED on a CLOSED shift is blocked (committed)",
  );

  // Stale cases — the application or shift has moved on.
  check(
    classifyWithdraw(
      { status: "REJECTED" },
      { status: "OPEN", date: futureDate, startTime: "07:00" },
    ) === "stale",
    "D: REJECTED application cannot be withdrawn",
  );
  check(
    classifyWithdraw(
      { status: "WITHDRAWN" },
      { status: "OPEN", date: futureDate, startTime: "07:00" },
    ) === "stale",
    "D: already-WITHDRAWN application is stale (idempotent)",
  );
  check(
    classifyWithdraw(
      { status: "APPLIED" },
      { status: "FILLED", date: futureDate, startTime: "07:00" },
    ) === "stale",
    "D: APPLIED on a FILLED shift is stale (manager already accepted someone)",
  );
  check(
    classifyWithdraw(
      { status: "ACCEPTED" },
      { status: "OPEN", date: futureDate, startTime: "07:00" },
    ) === "stale",
    "D: ACCEPTED with non-FILLED shift is stale (defensive)",
  );

  // Edge: shift starts exactly at "now" — the temporal guard treats it as
  // committed (start.getTime() <= now). A marshal cannot drop out at the
  // exact moment the manager expects them on site.
  const now = new Date();
  const justStartedDate = new Date(now);
  justStartedDate.setHours(0, 0, 0, 0);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  check(
    classifyWithdraw(
      { status: "ACCEPTED" },
      { status: "FILLED", date: justStartedDate, startTime: `${hh}:${mm}` },
      now,
    ) === "committed",
    "D: ACCEPTED + FILLED at the exact start moment is committed (no last-second drop)",
  );
}

// ---- F: Publish/apply schedulability --------------------------------------
const now = new Date();
const future = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
const past = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
check(
  isShiftSchedulable({ date: future, startTime: "07:00", endTime: "19:00" }),
  "F: future date with end > start is schedulable",
);
check(
  !isShiftSchedulable({ date: past, startTime: "07:00", endTime: "19:00" }),
  "F: past date is not schedulable",
);
check(
  !isShiftSchedulable({ date: future, startTime: "20:00", endTime: "08:00" }),
  "F: end-before-start is not schedulable",
);
check(
  !isShiftSchedulable({ date: future, startTime: "09:00", endTime: "09:00" }),
  "F: zero-length shift is not schedulable",
);
check(
  !canMarshalApply("UNAVAILABLE"),
  "F: UNAVAILABLE availability blocks apply",
);
check(
  canMarshalApply("OPEN_TO_WORK") && canMarshalApply("ACTIVELY_LOOKING"),
  "F: OPEN_TO_WORK and ACTIVELY_LOOKING allow apply",
);

// ---- H: Reset token is hashed, never stored raw ----------------------------
const raw = generateRawResetToken();
const hashed = hashResetToken(raw);
check(
  raw.length === 64 && /^[0-9a-f]+$/.test(raw),
  "H: raw reset token is 64-char hex (32 bytes)",
);
check(
  hashed.length === 64 && /^[0-9a-f]+$/.test(hashed),
  "H: hashed reset token is 64-char hex (SHA-256)",
);
check(
  hashed !== raw,
  "H: hashed form is different from raw (no accidental passthrough)",
);
check(
  hashResetToken(raw) === hashed,
  "H: hashing is deterministic (lookup by hash works)",
);

// ---- J: Login open-redirect safety ----------------------------------------
check(
  safeNextPath("/manager/shifts/abc", "/") === "/manager/shifts/abc",
  "J: simple internal path is allowed",
);
check(
  safeNextPath("/manager/shifts?tab=open", "/") === "/manager/shifts?tab=open",
  "J: internal path with query string is allowed",
);
check(
  safeNextPath("https://evil.example/phish", "/dashboard") === "/dashboard",
  "J: absolute external URL is rejected",
);
check(
  safeNextPath("//evil.example/phish", "/dashboard") === "/dashboard",
  "J: protocol-relative URL is rejected",
);
check(
  safeNextPath("/\\evil.example", "/dashboard") === "/dashboard",
  "J: backslash-prefixed malformed redirect is rejected",
);
check(
  safeNextPath("javascript:alert(1)", "/dashboard") === "/dashboard",
  "J: javascript: pseudo-URL is rejected",
);
check(
  safeNextPath("data:text/html,<script>", "/dashboard") === "/dashboard",
  "J: data: URI is rejected",
);
check(
  safeNextPath("%2F%2Fevil.example", "/dashboard") === "/dashboard",
  "J: percent-encoded protocol-relative redirect is rejected",
);
check(
  safeNextPath("", "/fallback") === "/fallback",
  "J: empty next falls back to the supplied default",
);
check(
  safeNextPath(undefined, "/fallback") === "/fallback",
  "J: missing next falls back to the supplied default",
);
check(
  safeNextPath(42 as unknown as string, "/fallback") === "/fallback",
  "J: non-string next (e.g. weird FormData value) falls back",
);
check(
  safeNextPath("ftp://elsewhere", "/fallback") === "/fallback",
  "J: ftp: scheme is rejected",
);

// ---- Summary --------------------------------------------------------------
const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
console.log(`\n${passed} passed, ${failed} failed (${results.length} total)`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const r of results) if (!r.pass) console.log(`  - ${r.label}`);
  process.exit(1);
}
