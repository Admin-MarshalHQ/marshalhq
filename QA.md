# MarshalHQ QA matrix

The founder-level pass/fail baseline for the core staffing loop. Run this after
any change that could touch state transitions, hiring, or contact release.

## Preconditions

```bash
npm run db:reset    # rebuilds schema + reseeds a realistic environment
npm run db:smoke    # exercises every documented state invariant
```

`db:reset` seeds two managers, six marshals, and eight shifts spanning every
`ShiftStatus` and every `ApplicationStatus`. `db:smoke` then runs twenty-two
assertions against the DB layer. Both must finish clean before moving on to
the UI walkthrough.

### Seeded logins

All passwords: `password123`

| Role     | Email                  | Notes                                    |
| -------- | ---------------------- | ---------------------------------------- |
| Manager  | manager@example.com    | Sam Patel, Ridgeback Productions          |
| Manager  | rosa@example.com       | Rosa Clarke, North Sound Pictures         |
| Marshal  | alex@example.com       | ACTIVELY_LOOKING, booked on completed S5 |
| Marshal  | jordan@example.com     | OPEN_TO_WORK                             |
| Marshal  | priya@example.com      | ACTIVELY_LOOKING, based in Manchester    |
| Marshal  | tom@example.com        | OPEN_TO_WORK, junior                     |
| Marshal  | dani@example.com       | ACTIVELY_LOOKING, booked on filled S4    |
| Marshal  | ana@example.com        | UNAVAILABLE (should not see open shifts) |

## Part 1 — automated invariants (`npm run db:smoke`)

Every row below is asserted against a fresh ephemeral dataset. All must pass.

| #   | Scenario                                         | Expected outcome                                                 | Result |
| --- | ------------------------------------------------ | ---------------------------------------------------------------- | ------ |
| 1   | Publish a draft shift                            | `DRAFT → OPEN`                                                   |        |
| 2   | Two marshals apply to an OPEN shift              | Both applications in `APPLIED`                                   |        |
| 3   | Same marshal applies to the same shift twice     | Blocked by `@@unique([shiftId, marshalId])`                      |        |
| 4a  | Manager accepts one of two applicants            | Shift → `FILLED`, `acceptedApplicationId` pinned                 |        |
| 4b  | Chosen application                               | Status → `ACCEPTED`                                              |        |
| 4c  | Other pending application                        | Status → `REJECTED` automatically                                |        |
| 5   | Only one ACCEPTED application per shift          | Count of `ACCEPTED` for that shift equals 1                      |        |
| 6a  | Contact-release eligibility on rejected pair     | UI guard sees `status !== ACCEPTED` → hide contact               |        |
| 6b  | Contact-release eligibility on accepted pair     | UI guard sees `status === ACCEPTED` → show contact               |        |
| 7a  | Complete a past FILLED shift                     | Shift → `COMPLETED`, `completedAt` set                           |        |
| 7b  | Marshal profile after completion                 | `completedCount` and `reliableCount` each increment by 1         |        |
| 8   | Accepted marshal withdraws on a future shift     | Shift → `OPEN`, `acceptedApplicationId` cleared                  |        |
| 9   | Manager closes an OPEN shift without hiring      | Shift → `CLOSED`, all `APPLIED` auto → `REJECTED`                |        |
| 10a | Manager cancels a FILLED shift                   | Shift → `CLOSED`, not `COMPLETED`                                |        |
| 10b | acceptedApplicationId after cancel               | Cleared to `null`                                                |        |
| 10c | Previously accepted application after cancel     | Status → `WITHDRAWN`                                             |        |
| 10d | Sibling rejected application after cancel        | Remains `REJECTED`                                               |        |
| 11a | `canCompleteShift` on future-ended FILLED shift  | Returns `false`                                                  |        |
| 11b | `canCompleteShift` on past-ended FILLED shift    | Returns `true`                                                   |        |
| 11c | `canCompleteShift` on non-FILLED shift           | Returns `false` even if end time passed                          |        |
| 11d | `canCompleteShift` on today-late-ending shift    | Returns `false` at noon                                          |        |

## Part 2 — manual UI walkthrough

`db:smoke` cannot reach the rendered UI or the server-action layer. Walk the
following scenarios by hand against a fresh `db:reset`.

### 2.1 Manager path — Sam Patel (manager@example.com)

| #   | Action                                                                  | Expected outcome                                                                                         | Result |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| M1  | Load `/manager`                                                         | ACTIVE shows: 2 Open, 1 Filled, 1 Draft. ARCHIVE shows: 1 Completed. No Rosa shifts visible.             |        |
| M2  | Open the ITV drama unit base shift (S2)                                 | Status badge reads `Open`. Shows 3 pending applicants. No `+44` contact shown for any applicant yet.     |        |
| M3  | Open the Sky commercial shift (S3)                                      | Status `Open`, 2 pending applicants. The earlier self-withdrawn applicant (Alex) is NOT counted pending. |        |
| M4  | Open the BBC drama shift (S4, Filled)                                   | Status `Filled`. Booking page shows Dani Santos with email and phone revealed.                           |        |
| M5  | Try to mark the BBC drama (future-dated) Completed                      | Action is refused / control is disabled with "end time has not passed" messaging.                        |        |
| M6  | Open the Channel 4 factual shift (S5, Completed)                        | Status `Completed`. Alex Morgan attributed as the booked marshal. Reliability marked ✓.                  |        |
| M7  | On S2, accept one applicant                                             | Shift flips to `Filled`. Contact for that marshal appears. Other two applicants move to `Rejected`.      |        |
| M8  | On the newly filled S2, click the cancel/close control                  | Shift moves to `Closed`. Accepted marshal's application shows `Withdrawn`. Not visible as active.        |        |
| M9  | Log in as Rosa (rosa@example.com)                                       | Sees only Rosa's shifts: 1 reopened Open (S7), 1 Closed (S6), 1 Draft (S8). No Sam shifts visible.       |        |

### 2.2 Marshal path — Alex Morgan (alex@example.com)

| #   | Action                                                                  | Expected outcome                                                                                         | Result |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| X1  | Load `/marshal`                                                         | Sees open shifts (across managers). Draft shifts not visible.                                            |        |
| X2  | Open the Channel 4 factual shift (S5, Completed, was Alex's booking)    | Application listed in history as `Accepted`. Manager contact is still visible on that application page.  |        |
| X3  | Apply again to the ITV drama unit base shift (S2 — already applied)     | Blocked with user-facing message: "You've already applied to this shift."                                |        |
| X4  | Open the Regional drama pickup shift (S7, reopened after withdrawal)    | Shown as open for applications. Alex's current application shows `Applied`.                              |        |
| X5  | Open the Sky commercial shift (S3 — earlier self-withdrawn)             | Application history shows `Withdrawn`. Contact is NOT released.                                          |        |

### 2.3 Marshal path — Jordan Blake (jordan@example.com)

| #   | Action                                                                  | Expected outcome                                                                                         | Result |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Y1  | Load `/marshal/applications`                                            | Sees: 1 Applied (on S2), 2 Rejected (S4, S5), 1 Rejected (S6, from closure). No contact released.        |        |
| Y2  | Open the BBC drama rejected application (S4)                            | Status `Rejected`. Manager contact is NOT visible.                                                       |        |
| Y3  | On S6 (closed without hire), view the rejection                         | Notification/inbox reflects that the shift was closed without hiring.                                    |        |

### 2.4 Marshal path — Ana Ruiz (ana@example.com, UNAVAILABLE)

| #   | Action                                                                  | Expected outcome                                                                                         | Result |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Z1  | Load `/marshal`                                                         | Apply controls reflect the UNAVAILABLE status, or listings are filtered per the product's current rule.  |        |

## Part 3 — known gaps (deferred)

These are documented so they do not get rediscovered as "bugs" during QA.

- **Transactional email** is not yet wired (task 1 in the MVP sequence). The
  `Notification` table is used as an in-app stand-in.
- **Status language** is partially canonicalised in [lib/state.ts](lib/state.ts)
  but not everywhere (task 2 in the MVP sequence).
- **Stale server-action errors** (e.g. `Error: Application is not pending`)
  surface as 500-style crashes when a manager clicks Accept on an already-decided
  application from a stale cached page. Should become a friendly in-page message
  under the task 2 copy pass.

## Freezing this as the baseline

Once every row above passes once, treat this doc as the founder test baseline.
Don't relax an expected outcome to match observed behaviour — change the code
until the matrix is satisfied, or revise the matrix deliberately with a note on
why.
