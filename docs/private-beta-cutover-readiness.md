# Controlled private beta cutover — readiness report

Date assembled: 2026-04-28
Branch: `claude/lucid-rhodes-9bf48c`
Database: production Postgres (via Prisma)
Email provider: Resend (via `lib/mail.ts`)
Founder identity: `admin@marshalhq.com` (single entry in `FOUNDER_EMAILS`)

This report confirms what was done in the cutover, what could not be confirmed from the worktree alone, and what the founder must verify before the first invite goes out. It deliberately does not start Sprint 4 and does not add product surface.

## Important caveat — this report is the dossier, not the execution

This worktree had **no production database credentials and no live Resend API key**. That means the cleanup scripts, the email round-trips, and the on-page smoke checks must be run by the founder against the live deployment. Each section below is structured so the founder can mark "done" against a concrete procedure rather than re-derive the steps.

The final recommendation at the bottom of this report is conditional on those founder-side checks passing.

---

## 1. QA data cleanup summary

**Tooling already exists**: `scripts/qa_contamination_scan.ts`, run via `npm run qa:scan` (report) and `npm run qa:scan -- --fix` (apply). The script:

- Identifies users whose email matches the reserved-signup blockade (`founder@`, `admin@`, `support@`, `noreply@` at `marshalhq.com`, plus anything in `FOUNDER_EMAILS`).
- With `--fix`, deletes only **recent** (within 7 days) `UNSET` or `MARSHAL` accounts that hit the blockade — i.e. obvious fake-founder signups, never the legitimate `admin@marshalhq.com` row.
- Identifies marshal profiles and shifts whose free-text leaks contact details (per `lib/contact-detect.ts`).
- With `--fix`, **pauses** (does not delete) leaking profiles and shifts. The owner re-saves through the form — which now has Zod validation — to unpause.

**Procedure for the founder**:

1. Pull a fresh `vercel env pull` and confirm `DATABASE_URL` points at production.
2. `npm run qa:scan` — read-only report. Capture the output.
3. `npm run qa:scan -- --fix` — apply the cleanup.
4. `npm run qa:scan` again — confirm zero hits.
5. `tsx scripts/mhq_list_users.ts` — visually scan the user list for any `@example.com` or other obvious test accounts that the contamination scanner did not catch (e.g. legit-format emails from a previous QA cycle). Pause or delete those manually if they exist. The seed data uses `manager@example.com`, `rosa@example.com`, `alex@/jordan@/priya@/tom@/dani@/ana@example.com` for QA — these must not exist in the production DB if the production DB has only ever had real signups, but should be checked anyway.
6. Confirm only one founder-style account remains: `admin@marshalhq.com`. If `founder@`, `support@`, `noreply@` style accounts exist, they should not — investigate before inviting.

### Accounts paused or removed

To be filled in by the founder after running the scripts:

| Account | Action | Notes |
|---------|--------|-------|
|         |        |       |

### Test shifts paused or removed

| Shift ID | Manager | Action | Notes |
|----------|---------|--------|-------|
|          |         |        |       |

### Orphaned records

The script does not currently look for orphaned applications or notifications without a matching user/shift. Cascading deletes on the schema mean orphans should be rare, but before the first invite, a quick spot-check via Prisma Studio (`npx prisma studio` against production) is worth doing. Anything that looks orphaned: leave alone unless clearly safe to remove. Document in this report instead of guessing.

---

## 2. Admin inbox and email delivery results

**What is actually wired**:

- Email sender: Resend, configured via `RESEND_API_KEY` and `EMAIL_FROM=MarshalHQ <admin@marshalhq.com>`.
- Founder allowlist: `FOUNDER_EMAILS=admin@marshalhq.com`. Single entry.
- Founder support notification: `SUPPORT_NOTIFY_EMAIL=admin@marshalhq.com`.
- Three email types exist in code:
  1. **Password reset** — to user, on `/forgot` submission ([app/actions/recovery.ts:58](../app/actions/recovery.ts)).
  2. **Support confirmation** — to submitter, on `/support` submission ([app/actions/recovery.ts:240](../app/actions/recovery.ts)).
  3. **Founder support notification** — to `admin@marshalhq.com`, on `/support` submission ([app/actions/recovery.ts:259](../app/actions/recovery.ts)).

**What is not implemented (and is correctly out of scope)**:

- No cancellation emails. Cancellation is in-product (status flips, in-app notifications). This is consistent with the MVP scope rule "do not add new notification types".
- No in-platform messaging. By design.
- No workflow notification emails (accept/reject/withdraw). All notifications are in-app via the `Notification` table, surfaced at `/notifications`.

**No email reveals contact before acceptance** — verified by reading every `sendEmail({...})` body in the codebase. The password reset, support confirmation, and founder support notification do not embed manager or marshal contact details.

**Procedure for the founder** (matches Steps 3 and 4 of [pre-invite-smoke-check.md](pre-invite-smoke-check.md)):

- Send a real password reset to a real inbox; confirm arrival, sender, link target (live URL not localhost), and one-time-use.
- Submit a real support request; confirm both emails arrive, both inboxes (junk/spam check), both links resolve.

### Critical configuration finding

The `.env.local` snapshot pulled from Vercel production has **`APP_BASE_URL="http://localhost:3000"`**. This value is used in the founder support notification email body to build the `/founder/support` link ([app/actions/recovery.ts:268](../app/actions/recovery.ts)).

If production is actually deployed with this env var as `localhost:3000`, the link inside the founder notification email will not work. The notification still arrives — the support request still lands in `/founder/support` — but the founder has to navigate manually instead of clicking through.

This is **not a contact-leak risk** and **not a beta blocker for the trusted loop**, but it is a real operational drag on support response time. Listed as ready (🟡) in [hardening-backlog.md](hardening-backlog.md). Recommend setting `APP_BASE_URL` to the live URL in the Vercel Production environment before sending the first invite.

---

## 3. Password reset result

To be filled in by the founder after Step 3 of the smoke check.

| Check | Result |
|-------|--------|
| Email arrives at inbox |  |
| Sender shown as `MarshalHQ <admin@marshalhq.com>` |  |
| In inbox, not spam |  |
| Link points at live URL, not localhost |  |
| Link works on first use |  |
| Link blocked on second use |  |

---

## 4. Support route result

To be filled in by the founder after Step 4 of the smoke check.

| Check | Result |
|-------|--------|
| Submitter receives confirmation |  |
| `admin@marshalhq.com` receives founder notification |  |
| Founder notification link points at live URL, not localhost |  |
| Request appears at `/founder/support` |  |
| Category and message rendered correctly |  |

---

## 5. Founder first-shift checklist

Created at [docs/founder-first-shift-checklist.md](founder-first-shift-checklist.md). Manual document. Twelve gates per shift, covering shift posting, applicant quality, acceptance, contact release, cancellation/dropout, completion, trust signal, support, founder intervention.

---

## 6. Manual trust and incident log

Created at [docs/beta-trust-incident-log.md](beta-trust-incident-log.md). Manual log. Includes incident classification (beta blocker / hardening / later improvement / noise), pause-invites trigger list, and pause history.

Companion document for post-shift feedback at [docs/post-shift-feedback.md](post-shift-feedback.md). Manual prompt for both sides; not built into the product.

---

## 7. Proposed first invite batch size

Detailed in [docs/private-beta-invite-batch.md](private-beta-invite-batch.md).

- 1 manager (2 if there are two real upcoming shifts).
- 3–8 marshals.
- At least one real upcoming shift.
- Founder personally sending each invite. No mass send. No public signup link in invite copy.

---

## 8. Final pre-invite smoke test result

Procedure in [docs/pre-invite-smoke-check.md](pre-invite-smoke-check.md). 14 steps to be run by the founder against the live URL with real emails immediately before the first invite.

DB-layer invariants are independently covered by `npm run db:smoke` ([prisma/smoke.ts](../prisma/smoke.ts)) — that test runs the acceptance, contact gate, withdrawal, completion, support request, paused-profile, contact-leak, founder-blockade, and reset-token paths against the schema. The pre-invite smoke check is the **human-driven** version on the live URL.

To be filled in by the founder:

| Step | Result |
|------|--------|
| 1. Signup |  |
| 2. Login |  |
| 3. Password reset |  |
| 4. Support route |  |
| 5. Founder panel |  |
| 6. Manager creates and publishes a shift |  |
| 7. Marshal creates a profile |  |
| 8. Marshal applies |  |
| 9. Manager reviews applicants |  |
| 10. Manager accepts |  |
| 11. Sibling rejection |  |
| 12. Contact gate verification |  |
| 13. Completion and trust signal |  |
| 14. Wrap-up (re-run scan) |  |

---

## 9. Beta watchpoints

The founder should watch these closely during the first real beta shift:

- First real shift post — does it read clearly to the marshals, and does the manager use the form correctly without help?
- First real marshal profiles — credible enough that a real manager can decide?
- First real applications — clean, no contact-leak attempts in cover notes?
- First acceptance — manager confident on the booking page; sibling rejection clean?
- First contact release — visible only to the accepted pair, no leak elsewhere?
- First cancellation or dropout (whoever pulls first) — status flow clear to both sides without the founder having to explain?
- First completion — `completedCount` and `reliableCount` increment as expected?
- First support request — both emails land at the right addresses, founder notification link works?

A failure on any of these is logged in [docs/beta-trust-incident-log.md](beta-trust-incident-log.md) and triggers a pause on further invites. Repair only the failed gate.

---

## 10. Unresolved caveats

These are real but do not block the controlled beta. Each is parked or ready in [docs/hardening-backlog.md](hardening-backlog.md):

- 🟡 `APP_BASE_URL` in Vercel production may still be `http://localhost:3000` based on the env.local snapshot. Set it to the live URL and redeploy before the first invite, or accept that founder support notification links will need manual navigation. **Recommend fixing before invite.**
- 🅿 No dedicated QA Postgres project — production DB and QA share infrastructure, separated by email domain and the contamination scanner.
- 🅿 No DMARC enforcement yet (`p=none` if at all). Tighten only after the beta has run clean for a window.
- 🅿 Apex-to-www redirect not confirmed.
- 🅿 No live past-shift fixture — withdraw-after-start is covered by smoke only, not manual QA.
- 🅿 Next.js 14.2.18 — track advisories, no known unpatched issues.
- 🅿 Edge-safe auth split — only relevant if the middleware is forced to edge runtime later.
- 🅿 Orphaned QA account cleanup — no automated `@example.com` filter; manual founder pass instead.

---

## 11. Final recommendation

> **open controlled private beta with caveats**

Conditions of the recommendation:

1. The founder runs `npm run qa:scan -- --fix` against production and confirms a clean second pass before sending any invite.
2. The founder runs the 14-step smoke check in [docs/pre-invite-smoke-check.md](pre-invite-smoke-check.md) against the live URL with real emails, and every step on contact-release, founder access, and account recovery passes.
3. The founder sets `APP_BASE_URL` to the production URL in Vercel before sending the first support-route check. (If the snapshot is just stale and production is already correct, this is a no-op — but it must be confirmed, not assumed.)
4. The first invite batch is the 1 manager / 3–8 marshals composition described in [docs/private-beta-invite-batch.md](private-beta-invite-batch.md), sent personally by the founder, against at least one real upcoming shift, with the founder watching the loop in real time.
5. Any failed trust gate during the beta triggers an immediate invite pause and repair of only the failed gate.

If condition 1 or condition 2 fails for a contact-release or recovery gate, the recommendation flips to **do not open beta** and a fresh repair pass is required. If condition 3 cannot be confirmed quickly, accept the broken founder-notification link as a documented caveat — it does not gate the trusted loop — and proceed.

This is not Sprint 4. This is not a public launch. The next move is real usage under close founder supervision, not more product expansion.
