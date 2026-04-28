# Final pre-invite smoke check

Run this against the live deployment, in a real browser, with real email addresses, immediately before sending the first invite. Do not skip steps. Do not run it on localhost.

The DB-layer invariants are already covered by `npm run db:smoke`. This check is the human-driven flow on the live URL.

## Setup

1. Live URL: [confirm with founder] — every step below uses this URL.
2. Two real test emails the founder controls (e.g. one inbox + one alias). Do **not** use Accenture work email.
3. Two browser profiles (or one normal + one incognito) so the manager and marshal sessions stay separate.
4. The contamination scan has been run with `--fix`: `npm run qa:scan -- --fix` against the production database, and the report shows zero remaining hits.

## Step 1 — Signup

- [ ] Marshal: signup at `/signup` with a real email; verify the account lands in `MARSHAL` role.
- [ ] Manager: signup at `/signup` (separate browser) with a real email; verify the account lands in `MANAGER` role.
- [ ] Try signing up with `admin@marshalhq.com`, `founder@marshalhq.com`, `support@marshalhq.com`, or `noreply@marshalhq.com`. Each must be refused. ([lib/access.ts:48-53](../lib/access.ts))

## Step 2 — Login

- [ ] Sign out and back in for both accounts. Confirm session sticks.
- [ ] After login, verify the user is routed to the correct dashboard (`/manager` or `/marshal`).

## Step 3 — Password reset

- [ ] Sign out the marshal. Hit `/forgot`. Enter the marshal's real email.
- [ ] The reset email arrives at the inbox within ~30 seconds.
- [ ] Sender appears as `MarshalHQ <admin@marshalhq.com>` (per `EMAIL_FROM`).
- [ ] Email is in the inbox, not spam/junk. (If in spam, mark as a hardening item before inviting and check DMARC/SPF/DKIM.)
- [ ] The link in the email points to the **live URL** (not localhost).
- [ ] Click the link, set a new password, log back in successfully.
- [ ] Repeat for the manager.
- [ ] Try the link a second time after use — confirm `/reset/expired`.

## Step 4 — Support route

- [ ] As a logged-out visitor, submit a request at `/support` (any category).
- [ ] Confirmation email arrives at the submitter inbox.
- [ ] Notification email arrives at `admin@marshalhq.com` (the `SUPPORT_NOTIFY_EMAIL` value).
- [ ] **Inspect the founder notification link**: it should point at `[LIVE URL]/founder/support`. If it points at `http://localhost:3000/founder/support`, fix `APP_BASE_URL` in Vercel before sending invites — see [hardening-backlog.md](hardening-backlog.md).
- [ ] As the founder, log in and visit `/founder/support`. Confirm the request is in the queue with the correct category and message.

## Step 5 — Founder panel

- [ ] Logged in as the founder, visit `/founder`, `/founder/applications`, `/founder/profiles`, `/founder/shifts`, `/founder/support`, `/founder/users`. Each page renders without error.
- [ ] Logged in as a non-founder manager or marshal, visit `/founder`. Confirm redirect away from the panel (per [middleware.ts:38-42](../middleware.ts)).

## Step 6 — Manager creates and publishes a shift

- [ ] Manager: at `/manager/shifts/new`, fill the form with realistic copy, no contact details. Save as `DRAFT`.
- [ ] Edit the draft, change to `OPEN` (publish). Confirm the shift appears in the marshal browse list.
- [ ] Try saving a shift with a phone number or email in the duties — confirm the schema rejects it.

## Step 7 — Marshal creates a profile

- [ ] Marshal: at `/marshal/profile/edit`, fill in full name, location, radius, experience, training, availability. Save.
- [ ] Confirm the profile renders on `/marshal/profile`.
- [ ] Try saving with a phone number in `experienceSummary` — confirm rejection.

## Step 8 — Marshal applies

- [ ] Marshal: at `/marshal/shifts`, find the shift posted in step 6.
- [ ] Apply with a clean cover note.
- [ ] Confirm the application appears at `/marshal/applications/[id]` with status `APPLIED`.
- [ ] Confirm the manager's contact is **not** visible.

## Step 9 — Manager reviews applicants

- [ ] Manager: at `/manager/shifts/[id]/applicants`, see the marshal's application.
- [ ] Open the applicant detail page. Confirm the marshal's profile fields are visible but the marshal's phone is **not** visible until acceptance.

## Step 10 — Manager accepts

- [ ] Manager accepts the marshal at `/manager/shifts/[id]/booking`.
- [ ] Shift status flips to `FILLED`.
- [ ] Manager now sees the marshal's phone number on the booking page.

## Step 11 — Sibling rejection

- [ ] If there's a second applicant on the same shift (use a third browser/incognito session if needed), confirm they auto-flip to `REJECTED` on accept.
- [ ] Confirm the rejected applicant's view does **not** show contact for the manager.

## Step 12 — Contact gate verification

- [ ] In the rejected/withdrawn applicant's session, open the application detail page. No phone number anywhere on screen.
- [ ] In the accepted marshal's session, open the application detail page. Manager's phone shown exactly once.
- [ ] Sign out completely and visit the same shift URL — no contact visible anywhere.

## Step 13 — Completion and trust signal

- [ ] If the shift's end time has not passed, advance the shift in the founder/admin tool or skip with a note. (For a real beta, completion happens organically after the shift ends.)
- [ ] When the end time has passed, manager marks the shift `COMPLETED` from the booking page.
- [ ] Marshal's profile `completedCount` increments by 1.
- [ ] If `reliabilityFlag` was set, `reliableCount` increments by 1.
- [ ] Shift appears in the marshal's history.

## Step 14 — Wrap-up

- [ ] No contaminated rows remain — re-run `npm run qa:scan` (read-only) and confirm zero hits.
- [ ] All test accounts created during this smoke run are either deleted, paused, or clearly documented as smoke fixtures.
- [ ] Record the result in [docs/private-beta-cutover-readiness.md](private-beta-cutover-readiness.md) before sending the first real invite.

## Pass / fail rule

- All 14 steps green → smoke pass; proceed to invite.
- Any step red on a contact-release, founder access, or recovery gate → smoke fail; stop and repair before any invite.
- Any step red on a non-trust gate (e.g. spam placement, broken support link) → caveat; either repair or document explicitly in the cutover report.
