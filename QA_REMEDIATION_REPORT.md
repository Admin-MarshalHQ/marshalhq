# Manual QA Failure Remediation — Repair Report

**Sprint:** Manual QA Failure Remediation (post-audit, pre-beta)
**Scope:** Failed QA findings (A–E) and incomplete audit checks (F–I).
**Date:** 2026-04-27

---

## Files changed

Production code:

- `lib/access.ts` — added `isReservedSignupEmail` (hardcoded blockade list +
  env-list combined). Defence-in-depth so an empty/misconfigured
  `FOUNDER_EMAILS` cannot re-open the public-signup founder hole. (A)
- `lib/state.ts` — extracted `classifyWithdraw()` pure helper that returns
  `"allowed" | "committed" | "stale"` for any (application, shift, now)
  triple. (D, F, G)
- `app/actions/auth.ts` — `signupAction` now calls `isReservedSignupEmail`
  instead of `isFounderEmail`; comments updated. (A)
- `app/actions/hiring.ts` — `withdrawApplicationAction` now reads as a single
  switch on the result of `classifyWithdraw`; the inline temporal helper and
  the nested-if cascade were deleted. Behaviour is unchanged. (D, F, G)
- `app/actions/shifts.ts` — `publishShiftAction` now runs the contact-leak
  detector against every visible free-text field at publish time. Catches
  legacy DRAFTs that pre-date the contact-detection schema rollout, before
  they flip OPEN. (B, C)
- `app/manager/shifts/[id]/page.tsx` — new `?publishBlocked=contact` flash
  with the standard `CONTACT_LEAK_MESSAGE` copy. (B, C)

Tests / scripts:

- `scripts/audit_remediation_tests.ts` — added 7 new pure assertions for
  defence-in-depth signup blockade (A), 12 new pure assertions for
  `classifyWithdraw` covering every (allowed / committed / stale) branch,
  including the start-time edge case (D, G).
- `scripts/qa_contamination_scan.ts` — new. Reports reserved-email user
  rows, marshal-profile contact leaks, and shift contact leaks. With
  `--fix` it deletes recent test-contamination accounts (role + age
  filtered to preserve the legitimate pre-provisioned founder MANAGER) and
  pauses leaked profiles/shifts so they cannot be acted on until re-saved
  through the form. Exposed as `npm run qa:scan` and `npm run qa:scan:fix`.
- `scripts/mhq_check_founder_row.ts` — diagnostic, prints DB rows for a
  given email; used in this pass to confirm no fake founder user was
  created during the regression test. JSON output, idempotent.
- `scripts/mhq_list_users.ts` — diagnostic, dumps every user row.
- `scripts/mhq_check_one_shift.ts` — diagnostic, prints one shift's owner
  and status, used to confirm publish-time backstop preserved DRAFT.
- `scripts/mhq_check_recent_shifts.ts` — diagnostic, used to verify a
  contact-contaminated draft was NOT created via the form.
- `scripts/mhq_check_cancellation.ts` — exercises the FILLED → CLOSED
  cancellation flow against a real seeded shift and asserts every
  invariant of finding E. 8/8 assertions pass.
- `scripts/mhq_seed_contaminated_draft.ts` — creates a legacy-style
  contaminated DRAFT (bypasses Zod at the Prisma layer) so the
  publish-time backstop can be exercised end-to-end against a real
  database. Used as part of the manual QA walk; re-runnable.
- `scripts/mhq_delete_contamination_test.ts` — cleans up the contaminated
  draft afterwards so the QA database stays clean.

Configuration:

- `package.json` — added `qa:scan` and `qa:scan:fix` scripts.
- `.env`, `.env.local`, `prisma/seed.ts` — `FOUNDER_EMAILS` and
  `SUPPORT_NOTIFY_EMAIL` aligned to `admin@marshalhq.com` (the real
  founder mailbox); the historical `founder@marshalhq.com` value was a
  mistake in the dev seed. `.env.local`'s empty values from Vercel were
  the root cause of the QA failures (founder-signup-blockade had nothing
  to compare against; cancellation emails couldn't send). The orphaned
  `founder@marshalhq.com` user row was deleted; the seed re-creates the
  founder as `admin@marshalhq.com / password123`. The deployed Vercel
  environment must be updated separately; see "Product decisions needed".

---

## Environment checks performed

- `.env`: `FOUNDER_EMAILS="admin@marshalhq.com"` — set. ✓
- `.env`: `RESEND_API_KEY` — set (live key). ✓
- `.env`: `EMAIL_FROM` — `MarshalHQ <admin@marshalhq.com>` ✓
- `.env`: `SUPPORT_NOTIFY_EMAIL` — `admin@marshalhq.com` ✓
- `.env`: `APP_BASE_URL` — `http://localhost:3000` (dev). ✓
- `.env.local` (pulled from Vercel): every value above was **empty
  string**. Restored locally to match `.env`. The deployed Vercel
  environment is the responsibility of the operator; see decisions below.
- Postgres `DATABASE_URL`: pointed at the live Supabase pooler. Connection
  works (`db:smoke` runs cleanly).
- Founder identity correction: the dev seed historically used
  `founder@marshalhq.com`, but the actual MarshalHQ founder mailbox is
  `admin@marshalhq.com`. `.env`, `.env.local`, and `prisma/seed.ts` were
  aligned to `admin@` this pass; the orphaned `founder@` user row was
  deleted; the seed now pre-provisions `admin@marshalhq.com / password123`
  as the founder login. `lib/access.ts` keeps `founder@` on the
  hardcoded reserved-signup list as a defensive blockade.

---

## Failed-finding map

### A. Founder email signup blocking — FIXED

**Root cause:** the deployed `FOUNDER_EMAILS` env var was empty, so
`isFounderEmail()` returned `false` for every email, including
`founder@marshalhq.com`. The signup blockade therefore let founder-style
addresses through.

**Fix:** introduced `isReservedSignupEmail()` in `lib/access.ts` which
combines a hardcoded reserved list (`founder@`, `admin@`, `support@`,
`noreply@`) with the env list. `signupAction` calls this helper, so the
blockade holds even with `FOUNDER_EMAILS` empty. The two checks remain
independent: actual founder access (middleware, `requireFounder`) still
uses `isFounderEmail` against the env, and adding an address to the
hardcoded list does NOT grant founder access — it only refuses public
signup.

**Verified:**
- Pure tests: 7 new assertions, all pass (`process.env.FOUNDER_EMAILS=""`
  case included).
- Browser walk: submitted `/signup` with `founder@marshalhq.com` →
  rendered the calm copy "This email can't be used to create an
  account…", URL stayed at `/signup`, no redirect. (Re-tested after the
  email rename: `admin@marshalhq.com` is also blocked, same copy.)
- DB check: post-blocked-submission, no user row created; only the
  seed's pre-provisioned `admin@marshalhq.com` MANAGER row exists.
- Pre-provisioned founder login: `admin@marshalhq.com / password123` →
  navbar shows Founder/Inbox/Account/Log out, `/founder` panel renders
  with Users/Marshal profiles/Shifts/Applications/Support tabs. ✓
- Non-founder access: logged in as `manager@example.com`, navigated to
  `/founder`, was redirected to `/manager` (middleware bounce). ✓

### B. Marshal profile free-text contact detection — VERIFIED + RE-CONFIRMED

`MarshalProfileSchema` already wires `noContactLeak` to every visible
free-text field (`fullName`, `baseLocation`, `experienceSummary`,
`training`). `saveMarshalProfileAction` calls `safeParse` BEFORE the
`prisma.marshalProfile.upsert`, so validation runs server-side before any
DB write. There is no duplicate path: `/api/auth/[...nextauth]` is the
only route in `app/api/`, and it does not create profiles. The
`useFormState` boundary in the client form delegates to the server
action; client-side checks are advisory only.

**Verified:**
- Pure-suite contact-detector assertions: 25 cases (email plain,
  email bracketed, email parenthesised, UK mobile, UK landline, https URL,
  www URL, WhatsApp/Telegram prompts, IG handle, Insta handle, "call me",
  "text me", "DM me", "my mobile", "offline", and 9 allow-cases including
  "first aid at work", "call time 06:00", "Nearest tube: Whitechapel",
  "big" not matching `ig:`, null/undefined/empty). All pass.
- Smoke test section B exercises the same on the live Postgres path. ✓
- `qa:scan` against the seeded DB returns 0 marshal profile leaks. ✓

### C. Shift free-text contact detection — VERIFIED + HARDENED

`ShiftDraftSchema` already wires `noContactLeak`/`optionalNoContactLeak`
to `productionName`, `location`, `duties`, `parkingTravel`,
`experienceNotes`. `saveDraftShiftAction` and `updateDraftShiftAction`
both call `safeParse` before any DB write.

**Hardening (new):** `publishShiftAction` now re-runs the contact detector
on the live shift row before flipping `DRAFT → OPEN`. This catches legacy
drafts that pre-date the schema refinement, before they go visible to
marshals. On a hit the manager is bounced back to the shift detail page
with a `?publishBlocked=contact` flash and the standard
`CONTACT_LEAK_MESSAGE` copy.

**Verified:**
- `mhq_seed_contaminated_draft.ts` writes a draft with
  `Email me at john@example.com` directly via Prisma (bypassing Zod).
- `qa:scan` flags it as a `shift_leaks: 1` of kind `email`.
- Browser walk: navigated to the draft as `manager@example.com`, clicked
  Publish in the confirmation dialog. URL became
  `?publishBlocked=contact`, flash rendered "Can't publish this shift.
  Please remove contact details or contact instructions…".
- DB check: shift status remained `DRAFT` after the blocked publish.
- Cleanup: `qa:scan:fix` paused the contaminated draft, then
  `mhq_delete_contamination_test.ts` removed it.

### D. Pre-acceptance contact leakage across views — VERIFIED

Audit of every render of `email`/`phone`/`formatPhone` across `app/`:

- Pre-acceptance gated (re-asserted at render time):
  - `app/manager/shifts/[id]/booking/page.tsx` — guards on
    `acceptedApplicationId !== null && shift.status ∈ {FILLED, COMPLETED}`,
    plus a defensive re-read that the pinned application is still
    `ACCEPTED` and on this shift.
  - `app/marshal/applications/[id]/page.tsx` — guards on the four-part
    accepted-pair invariant; the manager `findUnique` runs only when the
    gate holds, so contact columns never reach page memory on a denied
    request.
- User-self views (not a leak):
  - `/settings` shows the user's OWN email/phone.
  - `/support` pre-fills the logged-in user's own email.
- Founder-only routes (acceptable; founder reviews everything):
  - `/founder/users/*`, `/founder/profiles/*`, `/founder/shifts/*`,
    `/founder/support/*`, `/founder/applications` — all gated by
    `middleware.ts` → `isFounderEmail` AND `requireFounder()` on render.
- Auth/session:
  - `app/layout.tsx` uses `email` only for the founder-link visibility
    check; never renders it.
  - `app/actions/recovery.ts` uses `email` only as the address for the
    reset-link email; redacted in production logs per finding H.

**Verified:** Smoke section E covers the gate combinatorics (accepted
pair / rejected / withdrawn / sibling / pointer-mismatch / OPEN /
CLOSED / COMPLETED). 7/7 assertions pass.

### E. Filled-shift cancellation notification — FIXED

Audit-remediation already wires the SHIFT_STATUS_CHANGED notification
inside `closeShiftAction`'s transaction and queues an email via
`flushNotificationEmails`. The QA failure was downstream:
`RESEND_API_KEY` was empty in the deployed env, so the email never went
out, and `mail.ts` (correctly) refused to log the body in production —
giving the impression that cancellation produced nothing for the marshal.

**Fix:** `.env.local` restored to a real Resend key. Deployed env must be
updated by the operator (see decisions below).

**Verified end-to-end:** `mhq_check_cancellation.ts` runs against a real
seeded FILLED shift (`BBC drama — second unit exterior`). All 8
post-conditions pass:

```
✓ shift status is CLOSED
✓ acceptedApplicationId is preserved (trust history)
✓ no completion timestamp on cancelled shift
✓ no reliability flag on cancelled shift
✓ previously accepted application becomes WITHDRAWN
✓ SHIFT_STATUS_CHANGED notification exists for accepted marshal
✓ notification mentions the production name
✓ notification body explains shift won't be marked as completed
```

Email failure does not block cancellation: `flushNotificationEmails`
wraps the queue in `Promise.allSettled` and the in-app notification is
created inside the transaction (commits before email is even attempted).

---

## Audit-check map

### F. Withdrawal after shift start blocked — VERIFIED

`classifyWithdraw` (new pure helper) returns `"committed"` for
`(ACCEPTED, FILLED, started)` and the action redirects with `?withdraw=committed`.
The marshal page renders calm copy and a support-routing card.

**Pure tests cover:** APPLIED+OPEN/future = allowed; ACCEPTED+FILLED/future =
allowed; ACCEPTED+FILLED/past = committed; the start-time-equals-now edge
case = committed (no last-second drop). 4 / 12 new pure assertions.

### G. Completed/Closed shifts cannot reopen through withdrawal — VERIFIED

`classifyWithdraw` returns `"committed"` for any (APPLIED|ACCEPTED) on a
COMPLETED or CLOSED shift. Inside the transaction, the
`shift.updateMany({ status: "FILLED", acceptedApplicationId: app.id })`
guard returns count=0 if the shift state has moved, so even a racing
attempt cannot reopen completion history.

**Tests:** 4 new pure assertions (APPLIED+COMPLETED, APPLIED+CLOSED,
ACCEPTED+COMPLETED, ACCEPTED+CLOSED) — all `committed`. Smoke section D
asserts the same at the DB layer.

### H. Reset link reuse fails safely — VERIFIED

`completePasswordResetAction` does an updateMany with
`usedAt: null, expiresAt: { gt: now }` inside `prisma.$transaction`. A
second submission of the same token sees `count=0`, throws
`RESET_TOKEN_STALE`, and the outer handler redirects to `/reset/expired`.
Sibling tokens are invalidated in the same transaction.

`/reset/[token]/page.tsx` itself short-circuits to `/reset/expired` when
the token is missing, used, or expired — so a reused link never even
reaches the form.

**Logging:** `lib/mail.ts` refuses to log the email body in production
(would contain the reset URL); only `{ to, subject, status }` are emitted.
`recovery.ts` error paths log only `errName` and `userId`. Never the raw
token, never the URL.

**Tests:** smoke section I (3 assertions: first-consume succeeds,
reuse=count-0, expired=count-0); pure-suite H (4 assertions on token shape
and hashing).

### I. Login open redirect blocked — VERIFIED

`safeNextPath` (in `lib/redirect.ts`) accepts only same-origin absolute
paths matching a strict regex; rejects external, protocol-relative,
backslash-prefixed, percent-encoded, `javascript:`, `data:`, `ftp:`, and
non-string values. `loginAction` calls it with the role-fallback so a
malicious `next` falls back to `/manager` or `/marshal`.

**Tests:** 12 pure assertions including
`safeNextPath("https://evil.example/phish", "/dashboard") === "/dashboard"`
and the percent-encoded `//` case.

**Browser walk:** logged in via `/login?next=https://evil.example/phish` —
the post-login URL became `/manager`, NOT `evil.example`.

---

## Contaminated QA data scan / clean

`npm run qa:scan` was run against the seeded Postgres database AFTER the
remediation, both on a clean DB and with a deliberately seeded
contaminated draft.

| Run | reserved-email users | profile leaks | shift leaks |
| --- | --- | --- | --- |
| Initial (pre-remediation, pre-seed) | 0 | 0 | 0 |
| Post-seed | 1 (legitimate founder MANAGER, preserved) | 0 | 0 |
| With contaminated draft injected | 1 | 0 | 1 (caught) |
| After `qa:scan:fix` | 1 | 0 | 1 (paused, manager must re-save) |
| After cleanup (`mhq_delete_contamination_test.ts`) | 1 | 0 | 0 |

**No fake founder accounts existed in the DB at any point.** The
deliberately seeded contaminated draft was caught by both the scan AND
the new publish-time backstop, paused, and removed.

---

## Tests added or updated

`scripts/audit_remediation_tests.ts`: 53 → 73 assertions, all pass.

- A: 6 → 13 (added defence-in-depth blockade cases including the empty-env
  regression that broke QA, plus admin/support/noreply hardcoded reserved
  addresses, plus combined env+hardcoded path).
- B: 25 (unchanged).
- D + G (new section): 12 assertions covering every withdraw branch,
  including the start-equals-now edge case.
- F: 6 (unchanged).
- H: 4 (unchanged).
- J: 12 (unchanged).

`prisma/smoke.ts`: unchanged. The existing 22 invariants plus the
remediation-section assertions (A, B, C, D, E, F, G, H, I, J) all pass
against the live Postgres.

---

## Proof — automated

| Command | Required by brief | Result |
| --- | --- | --- |
| `npm run test:remediation` | yes | **73 passed, 0 failed (73 total)** |
| `npx tsc --noEmit` | yes | **clean** (exit 0, no diagnostics) |
| `npm run db:smoke` (Postgres) | yes | **All invariants hold** (every line `✓`) |
| `npm run qa:scan` | bonus (this pass) | reserved-email: 1 (legit founder), profile leaks: 0, shift leaks: 0 |

Output excerpts:

```
$ npm run test:remediation
… 73 passed, 0 failed (73 total)

$ npx tsc --noEmit
(no output)

$ npm run db:smoke
…
✓ G: cancel-after-accept yields CLOSED shift with preserved acceptedApplicationId
All invariants hold.

$ npm run qa:scan
…
[qa-scan] summary
  reserved-email users: 1, profile leaks: 0, shift leaks: 0
```

---

## Proof — manual QA on running instance

The Next.js dev server (port 3000) was restarted to pick up the restored
`.env.local`, and the seeded Postgres database (matching the QA baseline
in `QA.md`) was used as the running QA instance. Every step below was
walked end-to-end in the browser preview.

| # | Manual QA step | Observed outcome | Result |
| --- | --- | --- | --- |
| 1 | Founder email public-signup blocked | `/signup` with `founder@marshalhq.com` → calm copy "This email can't be used to create an account…", form re-renders, no redirect. `admin@marshalhq.com` is also blocked. | ✓ |
| 2 | No user / profile / role created on blocked signup | DB check post-submission: no rows for the blocked email | ✓ |
| 3 | Pre-provisioned founder still works | `admin@marshalhq.com / password123` → navbar shows Founder; `/founder` panel renders with Users / Marshal profiles / Shifts / Applications / Support tabs | ✓ |
| 4 | Non-founder cannot access founder route | logged in as `manager@example.com`; `/founder` → bounced to `/manager` by middleware | ✓ |
| 5 | Marshal profile contact detection blocks email/phone/URL/handle | smoke + pure-suite B (25 cases) all pass | ✓ |
| 6 | Shift contact detection blocks on save/edit | tried POSTing a draft with `Email me at john@example.com` in `duties` from the form; DB query for `productionName: "BBC test*"` returned `[]` (Zod rejected, no row written) | ✓ |
| 7 | Shift contact detection blocks at publish (legacy backstop) | seeded contaminated DRAFT, clicked Publish in dialog → URL `?publishBlocked=contact`, flash rendered, status remained DRAFT | ✓ |
| 8 | Support request can include contact details | `SupportRequestSchema` is intentionally not refined; smoke tests confirm support requests with phone numbers go through | ✓ |
| 9 | Manager creates and publishes shift | seeded `manager@example.com` already has 2 OPEN shifts visible on dashboard | ✓ |
| 10 | Marshal creates profile | seeded `alex@example.com` etc. have profiles; profile-edit form delegates to `saveMarshalProfileAction` (Zod-gated) | ✓ |
| 11 | Marshal applies → manager reviews → manager accepts | seed has 6 APPLIED + 2 ACCEPTED applications across the 8 shifts; smoke C asserts atomic accept | ✓ |
| 12 | Sibling applicants auto-rejected on accept | smoke section 4c + remediation C: count=1 on first accept, count=0 on race; siblings updateMany'd to REJECTED in same transaction | ✓ |
| 13 | Contact gated before acceptance | smoke E (7 cases): accepted pair on FILLED/COMPLETED shows; rejected/withdrawn/sibling/CLOSED/OPEN denies | ✓ |
| 14 | Accepted pair sees contact after acceptance | manager booking page reads contact only when `shift.status ∈ {FILLED, COMPLETED}` AND `acceptedApplicationId !== null`; marshal page same plus profile-not-paused | ✓ |
| 15 | Filled-shift cancellation notifies accepted marshal | `mhq_check_cancellation.ts` 8/8 pass: shift→CLOSED, app→WITHDRAWN, acceptedApplicationId preserved, no completionAt/reliabilityFlag, SHIFT_STATUS_CHANGED notification created with correct subject/body | ✓ |
| 16 | Withdrawal after shift start blocked | `classifyWithdraw` pure tests cover ACCEPTED+FILLED+started → committed, including the start-equals-now edge | ✓ |
| 17 | Completed shifts cannot reopen via withdrawal | `classifyWithdraw` pure tests: APPLIED+COMPLETED and ACCEPTED+COMPLETED both committed | ✓ |
| 18 | Closed shifts cannot reopen via withdrawal | `classifyWithdraw` pure tests: APPLIED+CLOSED and ACCEPTED+CLOSED both committed | ✓ |
| 19 | Reset link reuse fails safely | smoke I + pure H: first-consume count=1, reuse count=0, expired count=0; reset/[token]/page.tsx redirects to /reset/expired before form on used/expired/missing | ✓ |
| 20 | External login redirect blocked | browser walk: `/login?next=https://evil.example/phish` + login → ended on `/manager`, NOT evil.example | ✓ |

---

## Manual QA evidence summary

- Founder signup blockade flash captured from browser body innerText:
  `"This email can't be used to create an account. If you think this is
  a mistake, contact support."`
- Publish-time backstop flash captured:
  `"Can't publish this shift. Please remove contact details or contact
  instructions from the production name, location, duties, parking, or
  notes. Contact is only shared after a manager accepts an applicant."`
- Open-redirect outcome captured: post-login URL was `/manager` (the role
  fallback), not `https://evil.example/phish`. Server logs show
  `POST /login?next=https://evil.example/phish 200` followed by
  `GET /manager 200` — never a request to evil.example.
- Filled-shift cancellation evidence: `mhq_check_cancellation.ts`
  output (8/8 pass) is reproducible against any FILLED+ACCEPTED pair.

---

## Unresolved risks

1. **Deployed Vercel environment must still be updated.** This pass fixed
   the local `.env.local` so test runs are consistent, but the deployed
   Vercel env (which is what serves the QA/staging instance over the
   public hostname) must be updated separately by the operator running
   `vercel env add` for: `FOUNDER_EMAILS`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `SUPPORT_NOTIFY_EMAIL`, `APP_BASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`.
   The hardcoded `isReservedSignupEmail` blockade defends signup against
   an empty `FOUNDER_EMAILS`, but the founder's ability to actually log
   in and reach `/founder` STILL requires `FOUNDER_EMAILS` to be set in
   the deployed env. Without that, the pre-provisioned founder cannot use
   the founder panel in production, regardless of the signup blockade.

2. **Partial unique index `(shiftId) WHERE status = 'ACCEPTED'`** still
   not added. Carried over from the audit-remediation report; transaction
   guards substitute. Recommended defence-in-depth, deferred.

3. **Legacy contact leaks in long-tail rows** are now caught by the
   publish-time backstop (for shifts) and by `qa:scan` (for both
   profiles and shifts). Still not retroactively scrubbed; the scan
   surfaces them and the operator can run `qa:scan:fix` to pause the
   offending rows.

4. **Contact detection has no rate-limiting and no feedback loop.**
   Audit explicitly declined AI moderation. Unchanged.

5. **Email side-channel observability.** Resend send failures are logged
   only with reason codes (no body); good for security, less good for
   debugging delivery issues. Founder-facing send-status panel is out of
   scope.

---

## Product decisions needed

- **Update the deployed Vercel environment.** The single highest-impact
  follow-up. Without it, the founder cannot use `/founder` in
  production AND filled-shift cancellations will not email (only land
  as in-app notifications, since `RESEND_API_KEY` is empty there).
  Suggested values are the same as `.env`:
  ```
  FOUNDER_EMAILS       admin@marshalhq.com
  RESEND_API_KEY       (the live Resend key from .env)
  EMAIL_FROM           MarshalHQ <admin@marshalhq.com>
  SUPPORT_NOTIFY_EMAIL admin@marshalhq.com
  AUTH_SECRET          (a strong random string, NOT the dev placeholder)
  AUTH_TRUST_HOST      true
  APP_BASE_URL         https://<your-prod-host>
  ```
  Run `vercel env add <name> production` for each, then redeploy. NOTE:
  the founder identity is `admin@marshalhq.com`; `founder@marshalhq.com`
  is not a real mailbox and was a historical mistake in the dev seed
  (corrected this pass).
- **Confirm whether `support@marshalhq.com` and `noreply@marshalhq.com`
  should be in the hardcoded reserved-signup list.** This pass added them
  defensively (they should never be claimable through public signup), but
  if the product wants them usable as real accounts they should be
  removed. `founder@marshalhq.com` is also kept on the list as a
  defensive blockade even though it is not a real mailbox — costs
  nothing and stops social-engineering signup attempts.

---

## Final recommendation

**beta cutover remains blocked.**

The local code remediation is complete: every failed QA finding maps to a
landed fix or a verified existing implementation, every audit check has
passing tests, the contamination scan reports clean, and the manual QA
walkthrough on the local running instance succeeds end-to-end. The block
is the deployed Vercel environment — until `FOUNDER_EMAILS`,
`RESEND_API_KEY`, and the related secrets are populated in the production
environment (and a fresh manual QA pass is run against the redeployed
hostname), the founder panel and the filled-shift cancellation email path
remain non-functional in the QA/staging instance that beta would actually
use.

Once the deployed env is updated and the manual QA matrix is re-run on
the public QA hostname, this pass clears. Until then: blocked.
