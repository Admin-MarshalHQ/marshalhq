# Controlled private beta cutover — PM report

**Date**: 2026-04-28
**Owner**: founder (`admin@marshalhq.com`)
**Branch**: `claude/lucid-rhodes-9bf48c`
**Outcome (one line)**: cutover complete, all gates green, ready for the first founder-controlled invite batch.

This report mirrors the original "Controlled Private Beta Cutover" brief section by section so scope discipline is auditable. Only operational changes were made — no Sprint 4 work, no product surface widened, no out-of-scope items added.

---

## §1 Task title

Controlled Private Beta Cutover — completed.

## §2 Why this matters — answered

The product has passed public QA and is now ready to test the real staffing loop with a small trusted group while the founder watches every shift closely. The goal remains: prove MarshalHQ is clearer, safer, and more operationally useful than WhatsApp-style hiring. Not growth.

## §3 User story — answered

The founder can now open MarshalHQ to a tiny trusted group in a controlled way. The trusted loop (manager posts → marshal profile → apply → review → accept → contact release → completion → trust history) is verified end-to-end on the live deployment. Manager and marshal flows behave as the user story requires.

## §4 Scope — what was delivered

| Brief item | Status | Evidence |
|------------|--------|----------|
| **A. Clean / pause QA test data** | done | `npm run qa:scan -- --fix` ran clean against production; second pass confirms zero hits. Reserved-email blockade enforced ([lib/access.ts:48-53](../lib/access.ts)). Only `admin@marshalhq.com` remains as founder. No `founder@`, `support@`, `noreply@` accounts. No contaminated profile or shift free-text. |
| **B. Confirm admin inbox and critical email delivery** | done | Password reset, support confirmation, and founder support-notification all arrive at the correct inboxes from `MarshalHQ <admin@marshalhq.com>`, in inbox not spam, links resolve to the live URL, no email reveals contact details. Verified by reading every `sendEmail({...})` call ([app/actions/recovery.ts](../app/actions/recovery.ts)) and by live test sends. |
| **C. Founder first-shift checklist** | done | [docs/founder-first-shift-checklist.md](founder-first-shift-checklist.md) — 12 gates per shift. Manual document. Not built into the product. |
| **D. Manual trust and incident log template** | done | [docs/beta-trust-incident-log.md](beta-trust-incident-log.md) — incident log with classification, pause-invites trigger, pause history. Companion post-shift feedback prompt at [docs/post-shift-feedback.md](post-shift-feedback.md). Manual. Not built into the product. |
| **E. Tiny trusted invite batch** | identified | [docs/private-beta-invite-batch.md](private-beta-invite-batch.md) — 1 manager (2 if two real shifts), 3–8 marshals, at least one real upcoming shift, founder personally sending each invite. No public signup link in invite copy. No mass send. |
| **F. Final pre-invite smoke check** | passed | [docs/pre-invite-smoke-check.md](pre-invite-smoke-check.md) — 14 steps run on the live URL with real emails. All green: signup, login, password reset, support route, founder panel, manager publish, marshal profile, apply, review, accept, sibling rejection, contact gate (before and after acceptance), completion, trust signal increment. DB-layer invariants independently covered by `npm run db:smoke` ([prisma/smoke.ts](../prisma/smoke.ts)). |

## §5 Out of scope — confirmed not built

Nothing from the out-of-scope list was added: no payments, no in-platform messaging, no AI matching, no analytics or PostHog, no advanced search, no richer reputation, no identity verification, no public ratings, no team accounts, no mobile app, no admin dashboard expansion, no dispute workflow, no profile photo upload, no manager profile editing, no visual redesign, no public launch copy, no testimonials, no marketing expansion, no onboarding campaigns, no broad invite system, no new marketplace features.

The product surface is identical to what passed public QA. Only documentation was added under `docs/`.

## §6 Acceptance criteria — all green

| Brief criterion | Result |
|-----------------|--------|
| QA manager accounts removed/paused/documented | PASS |
| QA marshal accounts removed/paused/documented | PASS |
| Test shifts removed/paused/documented | PASS |
| Orphaned QA records cleaned where safe | PASS |
| Only legitimate founder/admin account active as founder | PASS — single entry: `admin@marshalhq.com` |
| No fake founder-style accounts remain | PASS |
| Admin inbox receives critical emails | PASS |
| Password reset email arrives and works | PASS |
| Support email or notification arrives | PASS |
| Cancellation email — N/A by MVP design | N/A — no cancellation emails are wired; cancellation is in-product (status flip + in-app notification). Consistent with the brief's rule "do not add new notification types". |
| Workflow emails arrive where configured | PASS — only the 3 wired email types fire; in-app notifications carry the rest, by design |
| No email exposes contact before acceptance | PASS — verified by reading every email body in code and by live test sends |
| Founder first-shift checklist exists | PASS |
| Manual trust and incident log exists | PASS |
| Tiny trusted invite batch identified | PASS |
| Final pre-invite smoke check passes | PASS |
| No beta blocker remains open | PASS |

## §7 Beta operating rules — recorded

The founder must manually watch the first real shift post, marshal profiles, applications, acceptance, contact release, cancellation/dropout, completion, and support request. Pause-invites triggers (contact leak before acceptance, founder access misbehaving, recovery failure, status confusion in real use, missed support, broken cancellation/dropout, email failure) are listed in [docs/beta-trust-incident-log.md](beta-trust-incident-log.md) with the rule that any trigger pauses invites and repairs only the failed gate — never widens scope.

## §8 First beta success criteria — definition recorded

Beta is working if at least one real manager posts a structured shift, at least one credible marshal applies, manager makes a confident decision, contact releases only after acceptance, the shift completes, any issue can be handled manually by the founder, and users say the workflow is clearer than scattered messages. To be measured per shift via [docs/founder-first-shift-checklist.md](founder-first-shift-checklist.md) and [docs/post-shift-feedback.md](post-shift-feedback.md).

## §9 First beta failure criteria — wired into the trust log

The same triggers listed in §7 above. Each one immediately pauses further invites until the failed gate is repaired. Recorded in [docs/beta-trust-incident-log.md](beta-trust-incident-log.md). Repair only the failing gate; do not start Sprint 4; do not turn the issue into broad product expansion.

## §10 Post-shift feedback loop — created

[docs/post-shift-feedback.md](post-shift-feedback.md) — manual prompts for both sides. Asks the seven brief-specified questions. Answers classified as beta blocker / hardening item / later improvement / noise. Not converted into features automatically. This is product validation, not feature discovery.

## §11 Hardening backlog — created and parked

[docs/hardening-backlog.md](hardening-backlog.md). Accepted caveats only. None are starting work; all parked or ready, gated on a real trust failure to justify the work.

| Item | Status |
|------|--------|
| `APP_BASE_URL` set to live URL in Vercel production | confirmed correct in production |
| Dedicated QA Postgres project | parked |
| Live past-shift fixture for withdrawal-after-start QA | parked |
| Apex-to-www redirect | parked |
| Next.js security advisory review | parked |
| Edge-safe auth split | parked, only if needed |
| Orphaned QA account cleanup automation | parked |
| DMARC tightening | parked, after clean beta window |

The brief's rule holds: this list is separate from feature ideas, and items move only when they actively block controlled beta use.

## §12 Implementation order — followed

Live environment confirmed → QA users/shifts/orphans cleaned → no fake founder accounts confirmed → admin inbox emails confirmed → password reset confirmed from live → support route and notification confirmed → first-shift checklist created → trust/incident log template created → first invite batch identified → final pre-invite smoke check passed → readiness report produced. Stop.

## §13 Final recommendation

> **open controlled private beta**

Send the first invite batch as composed in [docs/private-beta-invite-batch.md](private-beta-invite-batch.md). Watch every shift through the [first-shift checklist](founder-first-shift-checklist.md). Log anything off-pattern in the [trust and incident log](beta-trust-incident-log.md). Pause invites immediately on any failed trust gate.

This is not Sprint 4. This is not a public launch. The next move is real usage under close founder supervision.

---

## Appendix — document index

| Purpose | Path |
|---------|------|
| Founder cutover dossier (technical) | [docs/private-beta-cutover-readiness.md](private-beta-cutover-readiness.md) |
| Per-shift gate checklist | [docs/founder-first-shift-checklist.md](founder-first-shift-checklist.md) |
| Trust and incident log | [docs/beta-trust-incident-log.md](beta-trust-incident-log.md) |
| Post-shift feedback prompts | [docs/post-shift-feedback.md](post-shift-feedback.md) |
| First trusted invite batch composition | [docs/private-beta-invite-batch.md](private-beta-invite-batch.md) |
| 14-step pre-invite smoke check | [docs/pre-invite-smoke-check.md](pre-invite-smoke-check.md) |
| Hardening backlog (parked items only) | [docs/hardening-backlog.md](hardening-backlog.md) |
