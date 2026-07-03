# Founder first-shift checklist

This is a manual checklist. It is not a product feature. Run it for every beta shift while the controlled private beta is active. Stop inviting new users if a row repeatedly fails.

Copy the table below for each new beta shift. One row per gate; tick when the gate has been observed working end-to-end on the live deployment.

---

## Shift identity

- Shift ID:
- Production / job name:
- Manager (account email):
- Shift date:
- Watching from:
- Filled in by founder:

## Gate 1 — Shift posted

- [ ] Manager created the shift through the form (not through DB or admin assist).
- [ ] Shift status is `OPEN` (not stuck in `DRAFT` or `paused`).
- [ ] Manager can see the shift on the manager dashboard.
- [ ] Shift appears in the marshal browse list.

## Gate 2 — Shift fields clear and complete

- [ ] Production name reads as a real job, not a placeholder.
- [ ] Location is specific enough to act on.
- [ ] Date, start time, end time are correct and in the future.
- [ ] Rate and rate unit (hour or day) are correct.
- [ ] Duties read clearly without scrolling past noise.
- [ ] Parking/travel and experience notes match the brief (if used).
- [ ] No contact details, links, social handles, or `[at]/[dot]` strings in any free-text field. (The schema blocks these on save, but verify what the marshal actually sees.)

## Gate 3 — Applicants received

- [ ] At least one credible application has arrived.
- [ ] Applicant count and order match what the manager sees.
- [ ] Cover notes are readable and contain no contact disclosure.
- [ ] Applicant profile pages render without empty/broken sections.

## Gate 4 — Applicant quality usable

- [ ] Each applicant's profile gives the manager enough signal to decide (location, radius, experience summary, training, availability, completed/reliable counts).
- [ ] No `paused` profiles slipped into the list.
- [ ] No suspicious or empty profiles in the list.

## Gate 5 — Acceptance completed

- [ ] Manager accepted exactly one applicant through the booking screen.
- [ ] Shift status flipped to `FILLED`.
- [ ] `acceptedApplicationId` points at the chosen application.

## Gate 6 — Sibling applicants rejected

- [ ] All other `APPLIED` applications on the shift moved to `REJECTED`.
- [ ] Rejected applicants see a `REJECTED` status (no contact rendered).
- [ ] No duplicate or stale `APPLIED` rows remain.

## Gate 7 — Contact released only after acceptance

- [ ] The manager can now see the marshal's phone (and only now).
- [ ] The accepted marshal can now see the manager's phone (and only now).
- [ ] Confirm with a fresh browser/incognito session: rejected/withdrawn applicants on the same shift see no contact.
- [ ] No email, support message, or other surface revealed contact before acceptance.

## Gate 8 — Cancellation or dropout (only if it happens)

- [ ] If the manager cancelled: shift moved `FILLED → CLOSED`, accepted application moved to `WITHDRAWN`, the `acceptedApplicationId` pointer is preserved (trust history), no contact remains visible.
- [ ] If the marshal withdrew after acceptance: shift moved `FILLED → OPEN`, `acceptedApplicationId` cleared, marshal application moved to `WITHDRAWN`, contact no longer visible to either side.
- [ ] Both sides understood the new status without needing founder support.

## Gate 9 — Completion marked

- [ ] The shift's end time has passed.
- [ ] The manager marked it `COMPLETED` through the booking screen.
- [ ] The marshal sees the shift in their history with the correct manager and date.

## Gate 10 — Trust signal created

- [ ] `completedCount` on the marshal's profile incremented by 1.
- [ ] `reliableCount` on the marshal's profile incremented by 1 (if `reliabilityFlag` was set on completion).
- [ ] Profile renders the new counts on the next page load.

## Gate 11 — Support issue raised (only if applicable)

- [ ] Support form was reachable from the live URL.
- [ ] `admin@marshalhq.com` received the founder notification email for the request.
- [ ] Submitter received the confirmation email.
- [ ] The request appears in `/founder/support` with the correct category and message.
- [ ] Founder replied through normal email (not through a product feature).

## Gate 12 — Founder intervention (only if applicable)

- [ ] What did the founder have to do manually?
- [ ] Why was the product unable to handle it on its own?
- [ ] Is the cause: a beta blocker, an acceptable caveat, or a later improvement?

---

## Shift outcome

One of:

- [ ] Clean — every applicable gate passed without intervention.
- [ ] Clean with caveats — every applicable gate passed but [list caveats].
- [ ] Issue — at least one gate failed [list which and what was done].

If "Issue", record the row in [docs/beta-trust-incident-log.md](beta-trust-incident-log.md) and pause further invites until the failed gate is repaired.
