# Private-pilot browser rehearsal

Run this in a clean worktree on macOS or Linux with Node, the locked npm dependencies, PostgreSQL server binaries (`initdb`, `pg_ctl`, `postgres`) and Playwright Chromium installed. Run `npm ci` and `npx playwright install chromium` once for a fresh checkout. Run as an ordinary user with PostgreSQL on `PATH`, or set `SETRU_QA_PG_BIN` to its bin directory. `SETRU_QA_CHROMIUM` can point to an existing compatible Chromium binary.

```sh
npm run qa:browser -- --checks
```

The command creates a fresh PostgreSQL cluster on loopback, generates its own credentials, applies the current Prisma schema and the session-revocation SQL, and starts the actual Next.js development server on a separate loopback port. It launches fresh Pixel 7 browser contexts for the manager, three marshals, the founder and a signed-out visitor. It creates no production records. It refuses dotenv files in the checkout and supplies its own environment with external mail and analytics credentials absent. Browser requests are restricted to the rehearsal origin. A local deny proxy also blocks external redirects. Transactional mail is captured by the application's existing development transport in process memory and checked for recipient and content. Nothing is sent to a mailbox. The command removes the cluster after the run. `--checks` also runs the existing regression suite against a separate fresh database in the disposable cluster and runs the production build.

## Evidence scope

| Step | Browser evidence |
| --- | --- |
| Admission | Role-bound codes and agreement checkboxes, retained document download, wrong-role and uninvited refusal, code reuse, existing-account login, reset link and old-session revocation, founder passcode and role isolation. |
| Hiring | Draft and founder clearance, advert discovery, named application and redacted alert, partial and full capacity, individually released booking contacts, reserve rejection, one marshal's withdrawal, stopped recruitment and production cancellation. |
| Overnight | Next-day final wrap on the original advert, individual future call release, and the resulting final wrap in both marshals' dashboard, applications, booking and availability. |
| Attendance | Manager records per-call outcomes. Participant history separates partial, unresolved, worked, legacy blank and did-not-work. Founder corrects one disputed call. The corrected booking alone qualifies for reciprocal reviews. |
| Continuity | Admission pause, existing logins and saved terms, support submission and operator queue, private case boundaries, and continuation of attendance correction. Existing tests cover notification retries and obsolete-notice suppression. |

The fixture pre-provisions the founder identity, whose account still signs in by emailed passcode. Participants create accounts, accept documents, post, apply, select, change and settle bookings through normal browser forms. The runner advances the overnight example by placing its call dates first in progress and then in the past. It also shifts the recorded release boundary to the corresponding elapsed call and seeds two historical completed bookings with legacy blank and did-not-work outcomes. This exercises rendering and transitions once call dates have elapsed and preserves the original applied brief. Actual work and agreement to a real reschedule require separate evidence. The production build and database regressions are separate from the browser's Next development server.

## Controlled production follow-up

Use the [live pre-invite smoke check](pre-invite-smoke-check.md). First confirm the current production revision and database target, a separately cleared synthetic vacancy and staffed UTC window, the manager and two role-bound marshal inboxes, the versioned paperwork and live schema drift. Check the support alias from a controlled inbox through receipt and a human reply. Confirm the production retry worker runs when due and verify actual inbox receipt for the expected lifecycle messages. Preserve the public signup and waitlist holds. Record elapsed attendance, individual correction, the stop and continuity checks and authorised fixture cleanup in Evidence and gates. The approval to run a synthetic rehearsal does not clear a genuine vacancy, named applicant disclosure or post-acceptance coordination.
