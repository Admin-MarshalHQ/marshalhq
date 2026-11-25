# Final pre-invite smoke check

Run this against the live deployment, in a real browser, with real email addresses, immediately before sending the first invite. Do not skip steps. Do not run it on localhost.

Use only designated synthetic participants and a separately cleared, labelled rehearsal vacancy. Keep public registration, waitlist collection and wider hiring closed. Record the exact scope of any local or preview rehearsal separately.

## Setup

1. Live URL: https://setru.co.uk — every step below uses this URL.
2. Three distinct test emails the founder controls (e.g. one inbox + one alias). Do **not** use Accenture work email.
3. Two browser profiles (or one normal + one incognito) so the manager and marshal sessions stay separate.
4. Run the read-only contamination scan. Identify and isolate any fixtures before inviting real users.
5. The schema drift check passes: `npm run db:drift` reports PASS against the production database. A FAIL here means shipped code queries tables the database doesn't have — stop and see [schema-drift-check.md](schema-drift-check.md) before continuing.

6. Confirm the private admission configuration, role-specific inboxes, versioned disclosure pack and staffed UTC cutoff against [the release procedure](privacy-notice-release-gates.md). Use distinct test participants in preview and production. Leave admission paused until these conditions are met.
7. Record the release SHA, deployed domain, database target, authorised tester and time. Distinguish an in-app event, provider acceptance, inbox receipt and a human reply.

## Step 1 — Private admission

- [ ] Check that public `/signup` and the waitlist remain paused. Existing accounts can still log in and request support.
- [ ] During the cleared window, each designated synthetic participant uses `/pilot/join` with their role-specific invited inbox, receives a one-use code, accepts their terms, acknowledges the privacy notice, then obtains a durable copy. An existing invited account with outstanding terms uses `/pilot/agreement`.
- [ ] Verify the closed-window and uninvited paths without sending mail to an unrelated person. Record the actual receipt time in each controlled inbox.

## Step 2 — Login

- [ ] Sign out and back in for both accounts. Confirm session sticks.
- [ ] After login, verify the user is routed to the correct dashboard (`/manager` or `/marshal`).

## Step 3 — Password reset

- [ ] Sign out the marshal. Hit `/forgot`. Enter the marshal's real email.
- [ ] The reset email arrives at the inbox within ~30 seconds.
- [ ] Sender appears as `Setru <configured sender address>` (per `EMAIL_FROM`).
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

- [ ] Signed out, visit `/founder/waitlist` and enter the configured founder email at `/login/founder`. Check that the one-time code arrives, opens the requested page, and cannot be reused after signing out.
- [ ] Confirm the founder email is refused by the password form at `/login`.
- [ ] Logged in as the founder, visit `/founder`, `/founder/applications`, `/founder/profiles`, `/founder/shifts`, `/founder/support`, `/founder/users`. Each page renders without error.
- [ ] Logged in as a non-founder manager or marshal, visit `/founder`. Confirm redirect away from the panel.

## Step 6 — Manager creates and publishes a shift

- [ ] Manager: at `/manager/shifts/new`, fill the form with realistic copy, no contact details. Save as `DRAFT`.
- [ ] Use the [vacancy clearance checklist](founder-first-shift-checklist.md) for the exact draft version and designated viewers. Publish the cleared synthetic draft. Confirm it appears only for the cleared audience.
- [ ] Try saving a shift with a phone number or email in the duties — confirm the schema rejects it.

## Step 7 — Marshal creates a profile

- [ ] Marshal: at `/marshal/profile/edit`, fill in full name, location, radius, experience, training, availability. Save.
- [ ] Confirm the profile renders on `/marshal/profile`.
- [ ] Try saving with a phone number in `experienceSummary` — confirm rejection.

## Step 8 — Marshal applies

- [ ] Marshal: at `/marshal/shifts`, find the shift posted in step 6.
- [ ] Release named applications for this individual and brief, then apply with a clean cover note.
- [ ] Confirm the application appears at `/marshal/applications/[id]` with status `APPLIED`.
- [ ] Confirm the manager's contact is **not** visible.

## Step 9 — Manager reviews applicants

- [ ] Manager: at `/manager/shifts/[id]/applicants`, see the marshal's application.
- [ ] Open the applicant detail page. Confirm the marshal's profile fields are visible but the marshal's phone is **not** visible until acceptance.

## Step 10 — Manager accepts

- [ ] After clearance for this booking, the manager accepts one person from their applicant detail. Check the booking page.
- [ ] With places remaining, recruitment stays open. Filling the last place changes the shift to `FILLED`.
- [ ] Manager now sees the marshal's phone number on the booking page.

## Step 11 — Sibling applicants stay benched, reject works

- [ ] If there's a second applicant on the same shift (use a third browser/incognito session if needed), confirm they **stay `APPLIED`** after the accept — accepting does not auto-reject the bench; other applicants remain available in case a slot reopens after a dropout.
- [ ] Confirm the benched applicant's view does **not** show contact for the manager.
- [ ] Manager rejects the second applicant from the applicant detail page. Confirm they flip to `REJECTED` and receive the "Not selected" notification.
- [ ] Confirm the rejected applicant's view does **not** show contact for the manager.

## Step 12 — Contact gate verification

- [ ] In the rejected/withdrawn applicant's session, open the application detail page. No phone number anywhere on screen.
- [ ] In the accepted marshal's session, open the application detail page. Manager's phone shown exactly once.
- [ ] Sign out completely and visit the same shift URL — no contact visible anywhere.

## Step 13 — Completion and trust signal

- [ ] Use a short controlled rehearsal shift and wait for its scheduled wrap.
- [ ] When the end time has passed, manager records an attendance outcome per booking on the shift detail page.
- [ ] Marshal's profile `completedCount` increments by 1.
- [ ] Only worked outcomes earn completion credit. Only work confirmed reliable earns reliability credit. An unresolved outcome stays pending until founder review.
- [ ] Shift appears in the marshal's history.

## Step 14 — Wrap-up

- [ ] No contaminated rows remain — re-run `npm run qa:scan` (read-only) and confirm zero hits.
- [ ] All test accounts created during this smoke run are either deleted, paused, or clearly documented as smoke fixtures.
- [ ] Record the result and remaining gaps in the existing [Evidence and gates](https://docs.google.com/spreadsheets/d/1HS_HJuGSoOLr9VWNN8-d77EJU7SMILQEFkdAzUyHHZg/edit#gid=1865313147).

## Pass / fail rule

- A completed rehearsal supplies technical evidence. Each real pilot invitation and vacancy still requires its operating clearance.
- Any step red on a contact-release, founder access, or recovery gate → smoke fail; stop and repair before any invite.
- Any step red on a non-trust gate (e.g. spam placement, broken support link) → caveat; either repair or document explicitly in the cutover report.
