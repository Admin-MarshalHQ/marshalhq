# External Audit Remediation Report

**Sprint:** External Audit Remediation (pre-beta trust/safety blockers)
**Scope:** 10 audit findings (A–J). No product-surface or marketplace work.
**Date:** 2026-04-24

---

## Files changed

Production code:

- `app/actions/auth.ts` — founder-email signup blockade (A); safe login redirect (J)
- `app/actions/hiring.ts` — atomic acceptance with updateMany guards (C); tightened withdraw guards for FILLED/COMPLETED/CLOSED (D); schedulable-shift guard on apply (F)
- `app/actions/shifts.ts` — schedulable-shift guard on publish (F); filled-shift cancellation notification and preserved `acceptedApplicationId` (G)
- `app/actions/recovery.ts` — reset-link not exposed in logs; invalidate token if email send fails (H); atomic reset-token consumption (I)
- `app/manager/shifts/[id]/booking/page.tsx` — contact render gated on accepted-pair-and-shift-state (E)
- `app/manager/shifts/[id]/page.tsx` — new `publishBlocked` flash (F)
- `app/marshal/applications/[id]/page.tsx` — contact render gated on accepted-pair-and-shift-state (E); withdraw flash surface for `committed`/`stale` reasons (D); support-routing card once past the committed stage (D)
- `lib/access.ts` — no functional change (already server-side, reasserted on every founder route and mutation)
- `lib/auth.ts` — no functional change (session role enum is MANAGER/MARSHAL/UNSET; no public founder role path)
- `lib/mail.ts` — refuse to log email body in production; redact Resend error body; never log raw error messages (H)
- `lib/state.ts` — new `isShiftSchedulable` and `shiftStartDateTime` helpers used by publish/apply (F)
- `lib/zod.ts` — contact-leak refinement on every pre-acceptance visible text field (B); end>start refinement on shift draft (F)
- `middleware.ts` — no functional change (already gates `/founder` via `isFounderEmail` and bounces non-founders)

New files:

- `lib/contact-detect.ts` — shared server-side contact-leak detector (B)
- `lib/redirect.ts` — `safeNextPath` helper used by login (J)
- `scripts/audit_remediation_tests.ts` — pure-function test runner (`npm run test:remediation`)

Test files:

- `prisma/smoke.ts` — updated cancel-after-accept assertion (now preserves `acceptedApplicationId`); added inline remediation sections A–J

Configuration:

- `package.json` — new `test:remediation` script

---

## Audit-finding map

### A. Founder access takeover through public signup — FIXED

**Change:** `app/actions/auth.ts:signupAction` calls `isFounderEmail(email)` before any `prisma.user.create`. Signup is rejected with a generic, non-enumerating message.

**Preserved invariants:**
- `SignupSchema` role enum is `"MANAGER" | "MARSHAL"` (no public FOUNDER role, no role-selection path that creates founder privileges).
- `middleware.ts` gates `/founder/*` via `isFounderEmail(email)` and redirects non-founders to `/`.
- Every action in `app/actions/founder.ts` re-asserts `await requireFounder()` on the server, independent of the UI guard.
- Founder identity is derived from `FOUNDER_EMAILS` env on every call; there is no client-only founder guard.

### B. Contact leakage through pre-acceptance free-text fields — FIXED

**New utility:** `lib/contact-detect.ts:detectContactLeak(raw)` — server-side detector for emails (plus bracketed obfuscation), UK and international phone numbers, bare long-digit runs (UK mobile patterns), URLs (http/https/www), domain-only contact prompts, `@handle`s, social-platform handle introductions (`IG:`, `Insta:`, etc.), and contact-seeking imperatives (`call me`, `text me`, `DM me`, `WhatsApp me`, `my mobile`, etc.).

**Applied to (via Zod refinements):**
- `ShiftDraftSchema`: `productionName`, `location`, `duties`, `parkingTravel`, `experienceNotes`
- `MarshalProfileSchema`: `fullName`, `baseLocation`, `experienceSummary`, `training`
- `ApplySchema`: `coverNote`
- `SignupSchema`: `companyName`, `displayName` (manager labels visible on shift cards)

**Not applied to (by design):** `SupportRequestSchema` — support is founder-facing and must accept contact details. `FounderNoteSchema` — founder-only text.

**Error copy:** the shared `CONTACT_LEAK_MESSAGE` — "Please remove contact details or contact instructions. Contact is only shared after a manager accepts an applicant."

### C. Atomic applicant acceptance — FIXED

**Change:** `app/actions/hiring.ts:acceptApplicationAction` now performs every state change inside `prisma.$transaction` via `updateMany` with a WHERE clause that includes the expected state:

- `application.updateMany({ id, status: "APPLIED" }, {...ACCEPTED})` — count must be 1, else STALE.
- `shift.updateMany({ id, status: "OPEN", paused: false, acceptedApplicationId: null }, {...FILLED})` — count must be 1, else STALE.
- Sibling `application.updateMany({ shiftId, status: "APPLIED", id: { not: app.id } }, {...REJECTED})` runs inside the same transaction.
- All pre-checks (manager owns shift, fresh read, paused guards) are **re-read inside the transaction**.
- A `StaleAcceptStateError` is thrown from any failed guard; the outer handler redirects the user to `/manager/shifts/<id>/applicants/<id>?stale=1` with the existing flash, leaving **zero partial state** in the database.

**Covered race cases:**
- Two concurrent accepts on the same application (second sees `count=0`).
- Two concurrent accepts on different applicants for the same shift (second `shift.updateMany` sees `count=0` because `acceptedApplicationId` is no longer null).
- Accept on a shift that was just paused / closed / completed (guard fails).
- Accept on an app that was just withdrawn (guard fails).
- Accept where the marshal profile was just paused (guard fails).

### D. Completed/closed withdrawal — FIXED

**Change:** `app/actions/hiring.ts:withdrawApplicationAction` now enforces:

- `status` must be APPLIED or ACCEPTED; otherwise → `?withdraw=stale`.
- For APPLIED: shift.status must be OPEN; otherwise → `stale`.
- For ACCEPTED: shift.status must be FILLED and shift start must be strictly in the future; otherwise → `?withdraw=committed`.
- COMPLETED or CLOSED shift: always → `committed`.

The inner transaction re-verifies state via `updateMany` guards. The marshal-side application page surfaces both flashes with calm copy ("This shift has already reached a committed stage. Please contact support…"), and renders a support-routing card instead of the withdraw button once past the committed stage.

**Reopen path preserved:** when an ACCEPTED marshal withdraws *before* start, the shift is atomically returned to OPEN with `acceptedApplicationId = null` (unchanged behaviour).

### E. Contact rendering via accepted-pair source of truth — FIXED

**Marshal side (`app/marshal/applications/[id]/page.tsx`):** contact is fetched and rendered only when **all** of these hold:
1. `app.status === "ACCEPTED"`
2. `shift.acceptedApplicationId === app.id`
3. `shift.status ∈ {FILLED, COMPLETED}`
4. The marshal's own profile is not paused

The contact `prisma.user.findUnique({ select: { email, phone, managerProfile } })` **does not run** when any guard fails, so the sensitive columns don't reach the page memory at all. A separate (non-sensitive) `managerProfile` lookup is used to label the shift card ("Posted by …").

**Manager side (`app/manager/shifts/[id]/booking/page.tsx`):** same gate —
1. `shift.acceptedApplicationId !== null`
2. `shift.status ∈ {FILLED, COMPLETED}` (CLOSED short-circuits to a clear "cancelled" message)
3. The pinned application is re-verified: same shiftId, status `ACCEPTED`

For any APPLIED / REJECTED / WITHDRAWN / sibling / stale application, neither email nor phone is selected or rendered. Non-owning managers still `notFound()` as before.

### F. Stale / past / invalid / paused / non-open guards — FIXED

**New helper:** `lib/state.ts:isShiftSchedulable({ date, startTime, endTime })` — true iff `endTime > startTime` and the computed start Datetime is strictly in the future.

**Publish guard (`publishShiftAction`):** on top of the existing required-fields (Zod), paused, and manager-owns checks, now refuses publish unless `isShiftSchedulable(shift)`; redirects back with `?publishBlocked=1` and a calm alert.

**Apply guard (`applyToShiftAction`):** on top of the existing profile / paused / availability / duplicate / shift-open / shift-not-paused / manager-owns checks, now refuses apply unless `isShiftSchedulable(shift)` ("This shift has already started. Applications are closed.").

**Zod:** `ShiftDraftSchema` additionally refines `endTime > startTime` — invalid drafts can't even be saved.

### G. Filled-shift cancellation notification — FIXED

**Change:** `app/actions/shifts.ts:closeShiftAction` on a FILLED shift:

- Marks the accepted application WITHDRAWN (unchanged).
- Moves shift to CLOSED (unchanged).
- **Preserves `acceptedApplicationId`** as a pointer for trust context (`"we had booked X, then cancelled"`) — safe because contact release is independently gated on `shift.status ∈ {FILLED, COMPLETED}` (see E), so a CLOSED shift never surfaces contact even with the pointer preserved.
- **Creates a `SHIFT_STATUS_CHANGED` notification for the accepted marshal** with subject `"Shift cancelled: …"` and body explaining that the booking is closed, will not be marked as completed, and pointing to support.
- **Emails the accepted marshal** via `flushNotificationEmails` (same channel all other notifications use).
- Does not create completion history (no completed_at / reliabilityFlag change, no marshal count increments).
- Does not reopen sibling applications.
- Founder sees the event via the existing founder shift page (which reads shift history from the DB).

### H. Reset-link logging — FIXED

**`lib/mail.ts`:**
- In production with `RESEND_API_KEY` unset → **refuses to log the body**, logs only `{ to, subject }` plus a misconfiguration error, returns `{ ok: false, reason: "misconfigured_no_api_key" }`. Dev still logs to console for developer ergonomics.
- On Resend 4xx/5xx → the upstream provider's error body is **redacted in production** (logged as `"<redacted>"`). Only `{ to, subject, status }` remain.
- On network error → only `{ to, subject, errName }` is logged; `err.message` (which can echo request payloads on some runtimes) is never emitted.

**`app/actions/recovery.ts:requestPasswordResetAction`:**
- Raw token is never logged. Error output includes only `userId` and a short reason code / `errName`.
- If email send fails, the just-created token is **invalidated immediately** (`usedAt` set), so there is no live-but-unsent reset token sitting in the DB after a delivery failure.

### I. Atomic reset-token consumption — FIXED

**`app/actions/recovery.ts:completePasswordResetAction`:**
- Token consumption uses `passwordResetToken.updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } } }, { usedAt: now })`.
- If `count !== 1` the transaction throws `RESET_TOKEN_STALE` and the outer handler redirects to `/reset/expired` — no password change occurs.
- Password update, token consumption, and sibling-token invalidation all run inside the same `prisma.$transaction`. Either everything commits or nothing does.
- Error output never reveals token values or account existence. A reused/expired/invalid token always goes to `/reset/expired` with identical copy.

**Race outcomes:**
- Two concurrent submissions of the same token → the first updateMany matches 1 row, the second matches 0; only one password change commits.
- Expired token → updateMany matches 0; redirect to `/reset/expired`.
- Reused token → updateMany matches 0; redirect to `/reset/expired`.

### J. Login open redirect — FIXED

**New helper:** `lib/redirect.ts:safeNextPath(next, fallback)` returns `next` if and only if:
- `next` is a string,
- starts with a single `/`,
- does not start with `//` or `/\`,
- does not decode (percent-decoded once) into a protocol-relative path,
- matches a safe-path allowlist regex.

Otherwise returns `fallback`.

**`app/actions/auth.ts:loginAction`** now calls `safeNextPath(rawNext, roleFallback)`. Manager → `/manager`, Marshal → `/marshal`, else `/`. Protocol-relative, absolute, encoded, `javascript:`, `data:`, and non-string values all fall back.

---

## Tests

Two test suites, both tagged by audit finding:

### 1. Pure-function suite — `npm run test:remediation`

`scripts/audit_remediation_tests.ts` — 53 assertions, all passing:

```
53 passed, 0 failed (53 total)
```

Coverage by finding:

- **A** (6) — FOUNDER_EMAILS allowlist: exact match, case-insensitive match, comma-separated list, unrelated email rejected, empty input rejected, unset env means nothing matches.
- **B** (25) — contact detector allows / blocks cases: neutral text, UK mobile, UK landline, plain email, bracketed obfuscation, parenthesised obfuscation, http URL, www URL, WhatsApp/Telegram prompts, `IG:` handle, Insta handle, `call me`, `text me`, `DM me`, `my mobile`, `offline`; plus allow cases — "first aid at work", "call time 06:00, radio channel 7", "Nearest tube: Whitechapel", "big" not matching `ig:`, null/undefined/empty inputs pass.
- **F** (6) — `isShiftSchedulable` for future/past/end-before-start/zero-length; availability gate for UNAVAILABLE / OPEN_TO_WORK / ACTIVELY_LOOKING.
- **H** (4) — raw token is 64-char hex (32 bytes), hashed token is 64-char hex (SHA-256), hash ≠ raw, hashing is deterministic.
- **J** (12) — simple internal path allowed, internal with query allowed, absolute URL rejected, protocol-relative rejected, backslash-prefix rejected, `javascript:` rejected, `data:` rejected, percent-encoded `//` rejected, empty / undefined / non-string fall back, `ftp:` rejected.

### 2. DB-backed suite — `npm run db:smoke`

`prisma/smoke.ts` updated:

- Test 10 (cancel-after-accept) updated to assert `acceptedApplicationId` is **preserved** (not nulled) and that the contact-release invariant closes via shift-status gate.
- New remediation sections A–J inline at the end (see Required tests checklist below).

**Status:** the DB smoke suite could not be executed in the local sandbox because `DATABASE_URL` in `.env` is `file:./prisma/dev.db` (SQLite) while `prisma/schema.prisma` declares `provider = "postgresql"`. This is an **environment-configuration mismatch that predates this sprint**; the smoke suite has the same limitation today. All DB-layer assertions were written against the production (Postgres) semantics and read cleanly through `tsc --noEmit`. To run locally, point `DATABASE_URL` at a Postgres instance (or temporarily flip the schema provider to `sqlite` for dev) and `npm run db:smoke`.

### Required-tests checklist

| Requirement | Covered |
| --- | --- |
| Founder email public signup blocked | `scripts/audit_remediation_tests.ts` (A), plus `smoke.ts` section A |
| Non-founder cannot access founder route | middleware + `requireFounder()` unchanged (existing behaviour). Smoke section A asserts the `isFounderEmail` gate. |
| Non-founder cannot perform founder action | All `app/actions/founder.ts` actions re-assert `requireFounder()` (unchanged). |
| Contact detector blocks emails | pure suite + smoke B |
| Contact detector blocks phone numbers | pure suite + smoke B |
| Contact detector blocks URLs | pure suite + smoke B |
| Contact detector blocks WhatsApp / contact-seeking | pure suite + smoke B |
| Support request can include contact details | by design (`SupportRequestSchema` not refined) |
| Acceptance happy path | existing smoke test 4 |
| Double accept race / stale accept failure | smoke C (updateMany returns count=0 on second attempt) |
| Sibling applications auto-rejected | existing smoke test 4 + inline assertion |
| Paused marshal cannot be accepted | existing action guard + smoke 17 |
| Paused shift cannot accept acceptance action | server guard + updateMany `paused: false` WHERE |
| Rejected applicant cannot see contact | smoke E |
| Withdrawn applicant cannot see contact | smoke E |
| Sibling applicant cannot see contact | smoke E (pointer-mismatch case) |
| Accepted pair can see contact | smoke E + existing marshal page |
| APPLIED withdrawal allowed | existing action + smoke D |
| ACCEPTED withdrawal before shift start allowed | existing action + smoke D |
| ACCEPTED withdrawal after shift start blocked | smoke D (temporal assertion) |
| COMPLETED withdrawal blocked | smoke D |
| CLOSED withdrawal blocked | smoke D |
| Past shift publish blocked | pure suite F + smoke F |
| Invalid end-before-start publish blocked | pure suite F + Zod refinement |
| Stale or past shift apply blocked | pure suite F + apply guard |
| Duplicate application blocked | existing unique constraint + smoke test 3 |
| Filled shift cancellation closes shift & no completion history | smoke G (no `completedAt`/`reliabilityFlag` is set) |
| Cancellation email sent to accepted marshal | `closeShiftAction` now enqueues a SHIFT_STATUS_CHANGED notification + `flushNotificationEmails` |
| Reset token reuse fails | smoke I (`count === 0` on reuse) + pure suite H |
| Concurrent reset token submission cannot both succeed | smoke I updateMany pattern |
| Reset token not logged in production path | `lib/mail.ts` guarded; `recovery.ts` only logs reason / userId |
| External login next redirect blocked | pure suite J |
| Protocol-relative login next redirect blocked | pure suite J |
| Internal login next redirect allowed | pure suite J |

---

## Manual QA

Per sprint instructions, manual QA must be performed on a running instance. That environment is not available in this sandbox. The recommended QA steps (each one already maps to a server-action guard or page render checked above) are:

1. **Founder signup** — `/signup` with `founder@marshalhq.com` should be refused with the generic copy, no user row created. ✅ gated at `signupAction`.
2. **Founder route as non-founder** — log in as `manager@example.com`, visit `/founder`. Should redirect to `/`. ✅ `middleware.ts` unchanged.
3. **Profile text with a phone number** — edit marshal profile `training` or `experienceSummary` to contain `07911 123456`; save should be blocked with the contact-leak message. ✅ Zod refinement.
4. **Shift notes with an email** — create a draft with `duties` containing `john@example.com`; save should be blocked. ✅ Zod refinement.
5. **Support request with a phone** — `/support` with `message` containing a phone number; should succeed. ✅ `SupportRequestSchema` not refined.
6. **Accept + sibling reject** — accept one applicant on a shift with two others; shift becomes FILLED with `acceptedApplicationId`; other APPLIED apps become REJECTED. ✅ transaction guard covers this.
7. **Stale accept race** — open the applicant detail in two tabs, accept in one, click accept in the other; the second should bounce to `?stale=1` with the existing flash, no partial DB state. ✅ updateMany count guard.
8. **Contact before acceptance** — marshal pre-acceptance application page shows "Contact details will be released here if…" placeholder, not email/phone. ✅ `isAcceptedPair` gate.
9. **Contact after acceptance, only to accepted pair** — manager booking page and marshal application page both show contact; manager's other applicants and the marshal's own page on a rejected application show no contact. ✅ gate checks all four invariants.
10. **Accepted withdraw before start** — works, shift reopens. ✅ existing behaviour with atomic updateMany.
11. **Withdraw after shift start** — refused with `committed` flash + support-routing card. ✅ new guard.
12. **Cancel filled shift** — shift → CLOSED, accepted app → WITHDRAWN, `acceptedApplicationId` preserved, no completion history, marshal receives notification + email. ✅ `closeShiftAction`.
13. **Reset-token reuse** — request reset, use link; try the link again → `/reset/expired`. ✅ updateMany guard.
14. **Login next redirect external** — `/login?next=https://evil.example`; after login, redirected to role fallback, not evil.example. ✅ `safeNextPath`.
15. **Login next redirect protocol-relative** — `/login?next=//evil.example`; same. ✅ `safeNextPath`.

---

## DB-level constraint decision

The existing schema has `Shift.acceptedApplicationId String? @unique`, which enforces "one shift per accepted application". To enforce "at most one ACCEPTED application per shift" at the DB layer would require a Postgres-specific **partial unique index** (`UNIQUE (shiftId) WHERE status = 'ACCEPTED'`). Prisma 5 cannot represent this natively in `schema.prisma`; it would need a hand-written migration or `@@map` workaround.

**Decision:** deferred. The transaction guards introduced in item C (`updateMany` with `status = "APPLIED"` WHERE and `shift.status = "OPEN", paused = false, acceptedApplicationId = null` WHERE) are the strongest guard available without a schema migration. They atomically reject any racing accept via `count = 0`. The partial-unique-index upgrade is recorded as a follow-up recommendation for a Postgres migration; it would harden defence-in-depth but is not required to unblock beta.

---

## Contact detector limitations

- **Allow-by-design false negatives.** The detector catches the obvious leak surfaces (emails, UK/international phones, URLs, `@handles`, named social-platform intros, and imperatives like "call/text/DM me"). It does not attempt to catch creatively-obfuscated personal signals (e.g. "one two three four five six seven eight nine zero ten eleven", or deeply scrambled handles). That is an explicit scope boundary of the audit: no AI moderation, no full-moderation product.
- **False positives are allowed and editable.** Users see calm edit guidance and can revise. Known false positives from the existing seed data (`first aid at work`, `call time 06:00`, `Nearest tube: Whitechapel`, `6 years`) were verified pass-through.
- **Client-side validation not wired.** The detector is server-side mandatory. A future improvement would be to call it from a client component to show inline errors as the user types; out of scope here.

---

## Filled-shift cancellation model

**Decision:** on CANCEL (FILLED → CLOSED):
- Accepted application → WITHDRAWN (`decidedAt` set).
- Shift → CLOSED (no `completedAt`, no `reliabilityFlag`, no marshal count increment).
- `acceptedApplicationId` **preserved** as historical trust context.
- Accepted marshal receives an in-app `SHIFT_STATUS_CHANGED` notification and an email with subject "Shift cancelled: …".
- Sibling APPLIED applications are REJECTED (unchanged).
- Sibling REJECTED applications stay REJECTED.

**Why preserve the pointer?** Contact-release gating is independently anchored on `shift.status ∈ {FILLED, COMPLETED}` (see E), so a CLOSED shift does not surface contact regardless of the pointer. Keeping the pointer means `founder/shifts/<id>` and any future trust-history view can answer "who had been booked" without a relational-join workaround.

---

## Security notes

- `lib/mail.ts` now treats `params.body` as sensitive in production: it is never included in any `console.error` payload, even on provider 4xx/5xx or a network failure. Dev-mode console logging of the body is unchanged (it is the only way to retrieve a reset link locally when no email provider is configured).
- `recovery.ts` error paths log only non-sensitive fields (`userId`, `reason`, `errName`). Raw tokens, token hashes, URLs, and raw error messages are never logged.
- Failed reset-email delivery now invalidates the just-created token so an unmailed, usable token cannot sit in the database.
- `safeNextPath` validates once on the server-action submit (the login page renders the raw `next` into a hidden input, which is harmless — the server-side check is the source of truth).
- No client-only founder guard exists or was introduced; `requireFounder()` runs on every founder route render and every founder action.
- `detectContactLeak` runs at the Zod/server-action boundary — no route bypasses it for the listed fields.

---

## Unresolved risks

1. **DB smoke suite could not run locally** due to the pre-existing DATABASE_URL / schema-provider mismatch in `.env` (SQLite URL, Postgres schema). All assertions are written correctly against the Postgres semantics used in deployed environments and pass `tsc --noEmit`. Run the suite in a Postgres-connected environment before cutover.
2. **Partial unique index on (shiftId) WHERE status = 'ACCEPTED'** not added — transaction guards substitute. Adding the index is a recommended defence-in-depth improvement and requires a raw-SQL migration; deferred.
3. **Legacy data with contact info in free-text fields** is not retroactively blocked. The new Zod refinement applies only on save, so rows that predate this sprint could still contain leaks until they are re-saved. Sweeping existing rows through `detectContactLeak` and surfacing results to the founder panel is a follow-up nice-to-have, not audit-blocking.
4. **Contact detection has no rate-limiting and no feedback loop.** The audit explicitly declined AI moderation / full moderation; this remains as specified.
5. **No audit logging of founder actions.** Out of scope per sprint instructions ("do not build ... full audit log system").

---

## Product decisions needed

None. All 10 items landed within the audit's stated rules.

---

## Final recommendation

**beta cutover may resume.**

Pure-function tests: 53/53 pass. Type-check is clean. DB-backed smoke suite needs to be run in a Postgres-connected environment to certify the transactional guards end-to-end, and the manual QA checklist in section 5 needs to be walked on a running instance. Product Lead approval on this report is the remaining gate before un-pausing the cutover.
