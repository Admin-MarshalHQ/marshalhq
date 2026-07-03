# MarshalHQ — Product Feature Review

_Product review against the MVP trusted staffing loop. Prepared 3 July 2026 against `main` at `30858a8` ("Hardening batch 1"), which landed the reviews, availability and shift-alert features. Assessment only — no application code was changed._

British English throughout. Every file and line reference below was read in this review session. Security findings are deliberately **not** re-litigated here — they are owned by [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md) (2 July 2026) and are cross-referenced, not repeated.

The loop everything is judged against:

> Manager posts a structured shift → marshal builds a credible profile → marshal applies → manager reviews applicants → manager accepts → contact details release only after acceptance → shift completes or closes operationally → early trust and reliability signals accrue.

Classification used throughout: **MVP Now** (strengthens the loop for the controlled beta), **Later** (real but not now), **Noise** (does not belong in this product's MVP).

---

## 1. Executive summary

The implemented product is a faithful, defensively built version of the documented MVP. The core loop works end to end and its hardest invariant — contact release only after acceptance — is enforced at every render site (§5). The state machine is explicit, centralised and race-safe (§6). Founder trust tooling (pause, notes, support queue) exists and is guarded (§7). Copy is unusually honest about scope, and empty states consistently point at the next action.

The material product findings are not missing features — they are **half-shipped and unwired work already committed** (in `30858a8`):

1. **The availability calendar is write-only.** Marshals can record unavailable dates (`app/marshal/availability/`), and `lib/availability.ts` documents that a booked-overlap must hard-block applying — but `shiftConflicts`/`datesOverlap` are imported nowhere. A marshal can be accepted on two overlapping shifts with no warning to anyone. This is the single biggest live trust gap: it can produce a real-world no-show at a real production during the beta.
2. **Shift alerts are dead scaffolding.** The `ShiftAlert` model, matcher (`lib/alerts.ts`), Zod schema and notification kind all exist, but there is no UI to create an alert and the publish action never runs the matcher. Nothing references them. This is unfinished surface that should be parked or removed, not finished — it is the closest of the three uncommitted features to feature drift.
3. **Two-way reviews are fully wired but mis-target on multi-marshal shifts.** `submitReviewAction` resolves the manager's review subject with `findFirst` on accepted applications (`app/actions/reviews.ts:46-51`), so on a shift with `marshalsNeeded > 1` the rating can land on the wrong marshal — a corrupted trust signal, which is worse than no signal.

Beyond those, the loop has three genuine friction points: past-dated OPEN shifts never resolve and clutter the manager's "Active" list forever; the manager dashboard gives no roll-up cue that applicants are waiting; and the accept/reject notifications omit the shift facts (dates, location) a marshal needs to act on them.

The proposed batch (§9) is five small changes, no schema or dependency changes, all inside the existing loop: wire the availability guard into apply, add pending-action and stale-shift cues to the manager dashboard, guard the review target, enrich the two decision notifications, and narrow the applicant-page queries so contact details are never even fetched pre-acceptance.

## 2. Current MVP fit assessment

**Fit is strong.** Each stage of the loop exists, is guarded server-side, and matches the product's own public promise (the landing page explicitly states the loop and its exclusions at `app/page.tsx:282-312`).

| Loop stage | Implemented | Quality |
|---|---|---|
| Structured shift posting | Yes — draft/publish with temporal + contact-leak guards | Solid (§3.4) |
| Credible marshal profile | Yes — required fields, availability enum, trust counters | Solid (§3.5) |
| Clear application | Yes — cover note, duplicate guard, availability enum backstop | Solid, minus the calendar gap (§3.7) |
| Manager applicant review | Yes — list + detail with reliability signal | Solid, minor friction (§3.8) |
| Accept / reject | Yes — transactional, race-safe, quota-aware | Solid (§3.9) |
| Post-acceptance contact release | Yes — gated at every site | Solid (§5) |
| Status transitions | Yes — explicit state machine | Solid, one gap: stale OPEN shifts (§6) |
| Completion / closure | Yes — temporal completion guard, cancellation cascades | Solid (§3.12) |
| Early trust signals | Yes — completed/reliable counters + two-way reviews | Wired, one targeting bug (§4) |
| Founder / manual ops | Yes — pause, notes, support queue | Adequate for beta (§7) |

**The main fit risk is governance, not code.** The beta cutover PM report ([private-beta-cutover-pm-report.md](private-beta-cutover-pm-report.md) §5) recorded "no public ratings, no richer reputation, no new marketplace features" as out of scope, and the codebase has since grown reviews, an availability calendar and alert scaffolding (committed in `30858a8`). This review's position (argued in §4 and §12): **reviews and availability defend the loop and should be kept and finished; alerts are drift and should be parked.**

A note on sources: the product-authority documents this review was asked to use (Product Context Master, MVP Roadmap, Hard MVP Boundary, Trust and Ops Playbook, etc.) do not exist in the repository under those names. The authority used instead: the landing-page scope statement, the schema's own boundary comments (`prisma/schema.prisma`), and the `docs/` beta dossier. See §12.

## 3. Area-by-area feature review

### 3.1 Public / waitlist / landing flow

- **Exists:** Public landing page (`app/page.tsx`) with hero, five-step loop explainer, WhatsApp-comparison table, and explicit scope copy ("No payments, no payroll, no in-app chat, no public ratings", `app/page.tsx:307`). Hero email capture (`app/page.tsx:139-156`) GET-submits to `/#waitlist`, reloading with `?email=` prefilled into the full form — functional, verified. Full waitlist form (`app/early-access/EarlyAccessForm.tsx`) with role split and conditional fields; server action (`app/actions/waitlist.ts`) creates a `WaitlistEntry` (never a User), sends confirmation + founder-notification emails best-effort, redirects to a branded thanks page (`app/early-access/thanks/page.tsx`). Founder reviews entries at `/founder/waitlist`.
- **Works well:** Copy states the MVP boundary on the front door; waitlist deliberately does not create accounts; validation client- and server-side.
- **Missing/weak:** No waitlist-email typo protection or resend (acceptable — the founder follows up manually by design); the thanks page sets no expectation of timescale. Rate limiting is absent but is a security item (CODEBASE_REVIEW F2), not re-scored here.
- **Affects:** founder/ops (lead quality). **Classification: works as designed — no MVP Now item.** Timescale copy tweak: Later.

### 3.2 Auth and role onboarding

- **Exists:** Pilot-code-gated signup with role selection (`app/signup/SignupForm.tsx`; codes checked server-side in `app/actions/auth.ts` before any email checks, so enumeration is blocked); reserved-email blockade (`lib/access.ts:48-62`); bcrypt passwords; transactional, single-use, hashed email-verification tokens (`app/actions/verification.ts:23-60`) with resend; login with safe `?next=` redirect; middleware role/verification gates (`middleware.ts:5-77`). Manager profile is created inside the signup transaction (`app/actions/auth.ts:74-81`); marshals are nudged to create theirs by a dashboard alert (`app/marshal/page.tsx:39-49`).
- **Works well:** Order of checks protects against enumeration; verification gate still permits `/settings`, `/support`, `/notifications` while unverified — a humane detail.
- **Missing/weak:** Static pilot codes with no tracking of who used which (founder tracks by hand — consistent with the manual-invite design); no approval step after signup (founder can only pause after the fact); no onboarding walkthrough (the empty states carry this adequately for a beta of this size).
- **Affects:** founder/ops. **Classification: Later** (invite tracking, approval state) — the manual process is the documented beta design ([private-beta-invite-batch.md](private-beta-invite-batch.md)).

### 3.3 Manager dashboard

- **Exists:** `app/manager/page.tsx` — Active (DRAFT/OPEN/FILLED) and Archive (COMPLETED/CLOSED) sections; per-card status badge, production, dates, rate, `booked x/y` capacity, and a pending-applicant count on OPEN cards (`app/manager/page.tsx:104,142`); quick actions and a good first-run empty state.
- **Works well:** Active/Archive split matches how a manager thinks; capacity label is honest.
- **Missing/weak:** **(a) No roll-up of pending applicants** — the count sits on each card only; a manager with several shifts must scan every card, and nothing at the top says "3 applicants waiting across 2 shifts". For a product whose pitch is "review applicants in one place", the dashboard should surface where the manager's attention is needed. **(b) Past-dated OPEN shifts squat in Active forever** — see §6. No filters/search (fine at beta scale).
- **Affects:** manager, status clarity, operational usefulness. **Classification: MVP Now** (both a and b — they are the manager-side heartbeat of the loop).

### 3.4 Shift creation / editing / publishing

- **Exists:** Structured form (`components/ShiftForm.tsx`) — production, location, date block, daily times, marshals needed, rate + unit, duties, optional parking/experience notes. Zod validation with contact-leak refinement on every free-text field (`lib/zod.ts:60-108`, `lib/contact-detect.ts:69-104` — catches obfuscated emails/phones/handles). Draft → publish flow (`app/actions/shifts.ts:52-181`) with a temporal guard (no publishing past-dated shifts) and a publish-time contact-leak backstop for legacy drafts. Editing only in DRAFT; revert-to-draft is blocked while applicants are active, with copy explaining why (`app/actions/shifts.ts:183-202`).
- **Works well:** This is the strongest surface in the product. The revert guard ("Reverting would silently reject them… close the shift instead so applicants receive a proper outcome") is exactly the trust posture the product sells.
- **Missing/weak:** Nothing at MVP level. Per-day pricing/skipped days are explicitly out of scope by schema comment (`prisma/schema.prisma:78-82`). The BST instant bug affecting temporal guards is already recorded as CODEBASE_REVIEW F5 — credited, not re-scored.
- **Affects:** —. **Classification: no MVP Now item.**

### 3.5 Marshal profile creation / editing

- **Exists:** Required name, base location, travel radius, experience summary; availability enum (`ACTIVELY_LOOKING` / `OPEN_TO_WORK` / `UNAVAILABLE`) with gating semantics in `lib/state.ts:137-149`; optional transport/licence/training/photo (https-only); trust counters `completedCount`/`reliableCount` (`prisma/schema.prisma:62-63`). An incomplete profile blocks applying (checked at `app/marshal/shifts/[id]/page.tsx:171-180`). Phone lives on `User`, optional.
- **Works well:** Fields map directly to what a manager needs to judge credibility; the profile page states "Contact details are never shown here."
- **Missing/weak:** Phone is optional, yet it becomes the released contact detail on acceptance — a booking can complete contact release with an empty phone field, leaving the manager with email only. Not a leak, but a weaker handshake than promised. Worth a nudge (warn on apply, or on profile, when phone is empty). **Classification: MVP Now (small)** — folded into recommendation R6's copy work rather than ranked separately.
- **Affects:** manager, trust.

### 3.6 Marshal shift browsing

- **Exists:** `app/marshal/shifts/page.tsx` filters to `OPEN`, unpaused, future-dated (`:26-31`); shows full structured detail plus the manager's aggregate rating on the detail page; "Contact details are released only after you're accepted" stated inline (`app/marshal/shifts/[id]/page.tsx:216-219`). DRAFT/paused shifts 404.
- **Works well:** Nothing leaks; the copy sets the contact expectation before the marshal invests effort.
- **Missing/weak:** No signal when a browsed shift overlaps the marshal's existing bookings or their own unavailability blocks — the data exists (`AvailabilityBlock`, accepted applications) and the pure helper exists (`lib/availability.ts:35-49`) but is unused. See §4/R1. No keyword/location filters — at beta volume the list is short; filters are **Later** (and adjacent to "broad marketplace search", so they should stay Later).
- **Affects:** marshal, manager, trust. **Classification: MVP Now** (the conflict signal only).

### 3.7 Application flow

- **Exists:** `applyToShiftAction` (`app/actions/hiring.ts:23-138`) — guards: shift OPEN/unpaused/not started (`isShiftSchedulable`, `:80`), profile exists and unpaused, availability enum not UNAVAILABLE (`:62`, server-side backstop), quota not full (`:88`), one application per shift per marshal (DB unique, `prisma/schema.prisma:117`). Optional cover note (contact-leak checked). Both sides notified on apply (`:113-120`). Withdrawal via `classifyWithdraw` (`lib/state.ts:175-206`): allowed / committed (route to support) / stale, with a reopen cascade that re-notifies still-pending applicants (`:221-222`).
- **Works well:** The withdraw classification is the most thoughtful piece of workflow design in the product; the committed→support route protects the manager's operational reality.
- **Missing/weak:** **The availability calendar and double-booking check are not consulted** (§4, R1). Otherwise complete.
- **Affects:** marshal, manager, trust. **Classification: MVP Now** (R1).

### 3.8 Manager applicant review

- **Exists:** Pending/Decided split ordered by application time (`app/manager/shifts/[id]/applicants/page.tsx`); applicant cards show name, location + radius, clamped experience, reliability label. Detail page (`applicants/[appId]/page.tsx`) shows the full profile, cover note, trust card (reliability ratio + this manager's prior star aggregate for the marshal), and a decision card whose copy states the contact-release consequence: "Accepting releases phone and email to you and to this marshal only."
- **Works well:** The decision moment carries exactly the right information and no contact details.
- **Missing/weak:** **(a)** Both pages fetch the full `User` (email, phone) via `include` and simply don't render it (`applicants/page.tsx:23-27`; same shape on the detail page). The invariant holds today, but the query shape means one innocent refactor (a spread into a client component, a new field in the card) could leak pre-acceptance contact. The fetch should be narrowed with `select` so the data can't leak because it was never loaded. **(b)** No sort/filter on pending applicants — fine at beta volume (Later). **(c)** Once a shift leaves OPEN the applicant list remains viewable but read-only — correct behaviour.
- **Affects:** trust (a); manager (b). **Classification: MVP Now (a)**, Later (b).

### 3.9 Accept / reject flow

- **Exists:** `acceptApplicationAction` (`app/actions/hiring.ts:244-346`) — transactional with CAS-style `updateMany` guards; re-checks OPEN, unpaused shift and profile, APPLIED status, quota (`:278`); auto-transitions OPEN→FILLED at quota (`:306`); concurrent accepts lose cleanly (`?stale=1` flash). Reject (`:348-383`) is APPLIED→REJECTED with notification. Other applicants stay APPLIED (never silently rejected) until the manager decides or the shift closes.
- **Works well:** Race safety here is what makes "accept one marshal" a promise rather than a hope. The pre-invite smoke check (docs) covers sibling rejection explicitly.
- **Missing/weak:** The decision notifications are thin — see §3.14/R5. No bulk reject (Later; at beta volume, deciding each applicant individually is arguably the right friction).
- **Affects:** marshal (notification quality). **Classification: solid; copy item is MVP Now (R5).**

### 3.10 Contact release

Covered in full in §5. Summary: gated correctly at every render site; the one weakness is over-fetching upstream of the gate (§3.8a).

### 3.11 Status transitions

Covered in full in §6. Summary: explicit machine, one real gap (stale OPEN shifts), one design note (reopen-after-dropout picks the most recent acceptance).

### 3.12 Completion / closure / cancellation / withdrawal

- **Exists:** Completion (`app/actions/shifts.ts:280-338`): FILLED→COMPLETED only after the block's scheduled end (`canCompleteShift`, `lib/state.ts:66-75`); the manager sets `reliabilityFlag` true/false; counters increment for every accepted marshal; differentiated notifications. Closure/cancellation (`:204-278`): DRAFT/OPEN/FILLED→CLOSED, auto-rejecting pending and withdrawing accepted applicants with notification — no one is left in limbo. Marshal withdrawal per §3.7. Dropout reopen (`:340-365`): FILLED→OPEN, withdrawing the most recently accepted marshal.
- **Works well:** Every terminal path notifies the affected party; the completion trust-invariant (cannot complete before the work could have happened) directly protects the reliability signal's meaning.
- **Missing/weak:** **(a)** No-show handling is only `reliabilityFlag=false` at completion — for a controlled beta with the founder watching every shift, that is acceptable; a dedicated no-show state is **Later**, and building it now would be premature process. **(b)** The manager-initiated reopen withdraws the *most recently accepted* marshal rather than letting the manager pick which one dropped out (`orderBy decidedAt desc`, `app/actions/shifts.ts:340-365`) — only wrong on multi-marshal shifts; **Later**, note it in the founder checklist until then. **(c)** Completion requires the manager to remember — nothing prompts them after the shift end passes. Folded into R3's dashboard cue (a FILLED shift past its end date is "awaiting completion").
- **Affects:** trust, status clarity, founder/ops. **Classification: (c) MVP Now via R3; (a), (b) Later.**

### 3.13 Founder / manual trust tools

Covered in §7. Summary: adequate for the beta design; no MVP Now gaps.

### 3.14 Empty states, mobile usability and copy clarity

- **Exists:** A shared `EmptyState` component used with specific, action-carrying copy everywhere it matters ("Post your first shift to start receiving applications" + button). Copy across the product is concrete and scope-honest (signup: "controlled private pilot"; support: "A human reviews every request"). Responsive Tailwind patterns throughout (`sm:grid-cols-*`, constrained form widths, full-width submit buttons, 16px base font); labels are real `<label>`s; errors carry `role="alert"`.
- **Works well:** Copy is a genuine product asset — it does trust work the code alone cannot.
- **Missing/weak:** The in-app **notification bodies** are the weakest copy in the product: "You're booked: X. The manager has accepted your application…" (`app/actions/hiring.ts:329-330`) omits dates, times and location — the facts a marshal writes into their diary; "Not selected" (`:374-375`) and "New applicant: X. …Review the applicant in the dashboard." (`:119-120`) similarly omit the specifics and deep links that make a notification actionable. For a product replacing WhatsApp messages, its own messages should carry at least as much information as the WhatsApp message would have. No dedicated mobile QA evidence, but no red flags found; targeted checks belong in the batch verification (§11).
- **Affects:** marshal, manager, operational usefulness. **Classification: MVP Now (notification copy, R5).**

## 4. Trust and workflow risk findings

**T1 — Double-booking is possible and invisible (highest product risk).** `AvailabilityBlock` rows are created and deleted (`app/actions/availability.ts:22,57`; UI at `app/marshal/availability/page.tsx`) but consumed by nothing: `shiftConflicts` and `datesOverlap` (`lib/availability.ts`) have zero importers across `app/`, `lib/` and `scripts/` (verified by grep). `applyToShiftAction` checks only the availability enum. Consequence: a marshal accepted on Shift A can apply to and be accepted on overlapping Shift B; both managers believe they have a booking; one gets a no-show. During a beta whose entire purpose is proving reliability, one such incident is a pause-invites trigger under the trust log's own rules ([beta-trust-incident-log.md](beta-trust-incident-log.md)). The helper's doc comment already specifies the correct behaviour (booked overlap = hard block; marked-unavailable = soft warn); it was written and never wired.

**T2 — The reviews feature can corrupt the trust signal on multi-marshal shifts.** `submitReviewAction` resolves the manager's subject via `findFirst({ shiftId, status: "ACCEPTED" })` (`app/actions/reviews.ts:46-51`). With `marshalsNeeded > 1`, the rating attaches to whichever accepted application the database returns first — potentially the wrong marshal — and the `(shiftId, authorId, direction)` unique constraint (`prisma/schema.prisma:225`) then prevents reviewing the others at all. A wrong reliability rating on a marshal's record is worse for trust than no rating. The server-side eligibility gate itself is sound (`reviewDirectionFor`, `lib/reviews.ts:35` — COMPLETED shifts only, participants only); the defect is purely subject resolution.

**T3 — Unfinished surface in the codebase (governance).** Position on the three newly landed features, judged against the loop:
- **Two-way reviews — keep (MVP Now, with T2 fixed).** These are private-to-the-loop ratings between parties who transacted, shown in applicant review and shift detail — they *are* the "early trust and reliability signals" stage of the loop, not the "public ratings" the cutover excluded. They extend the existing counters coherently.
- **Availability calendar — keep and finish (MVP Now).** Half of it (recording blocks) shipped; the half that defends the loop (conflict checking) did not. Unfinished, it is pure liability: it implies to marshals that the platform knows their availability when nothing reads it.
- **Shift alerts — park (Later, borderline Noise).** No UI, no wiring, no consumer; functionally a saved-search/notification-expansion feature, closest to "broad marketplace search" drift, and the beta docs' rule is "do not add new notification types". Do not finish this now. The dead code (`lib/alerts.ts`, `ShiftAlertSchema` in `lib/zod.ts:200`, the `ShiftAlert` model) can stay parked; removing the model would be a schema change and is not worth one.

**T4 — Contact-release over-fetch (latent, not live).** §3.8a: applicant pages load email/phone they never render. One refactor from a leak; narrow with `select`.

**T5 — Optional phone weakens the released handshake.** §3.5: contact release can deliver email-only. Small copy/nudge fix, folded into R5.

**T6 — Stale OPEN shifts misstate reality.** §6/S1: "Open" stops meaning "live and actionable" once the start date passes, for the manager and the founder views alike.

## 5. Contact-release assessment

**Verdict: the invariant holds at every site.** Verified this session:

- **Manager side:** contact renders only on the booking page (`app/manager/shifts/[id]/booking/page.tsx:137-138`), only for ACCEPTED applications, only while the shift is OPEN/FILLED/COMPLETED, with usage-limiting copy ("Shared only with you and the booked marshal"). The applicant list and detail pages render no contact (§3.8). The manager market pages (`app/manager/market/page.tsx`, `market/[id]/page.tsx`) expose company/display names only.
- **Marshal side:** manager contact renders only on the application page behind a re-checked accepted-pair guard — application ACCEPTED **and** shift OPEN/FILLED/COMPLETED **and** profile unpaused (`app/marshal/applications/[id]/page.tsx:54-98`). Browse and detail pages state the release rule before application.
- **Out-of-band channels:** no email template embeds contact details (re-verified in the cutover dossier and unchanged); free text is contact-leak-filtered at input (`lib/zod.ts`) and again at publish (`app/actions/shifts.ts:139-181`), with bracket-obfuscation handling (`lib/contact-detect.ts:69-104`).
- **Revocation:** cancellation withdraws accepted applications, and the marshal-side guard requires ACCEPTED status, so a cancelled booking stops rendering the manager's contact; a CLOSED shift stops rendering marshal contact on the booking page.

**Weaknesses (latent only):** T4 (over-fetch upstream of the gate) and T5 (optional phone). Neither is a leak today. Recommendation R4 removes T4 by construction.

## 6. Status-transition assessment

The machine (`lib/state.ts:7-23`) is small, explicit and enforced via `assertShiftTransition`/`assertApplicationTransition` in every action. Temporal guards cover publish, apply, completion and withdrawal. Auto-transitions (OPEN↔FILLED on accept/withdraw) are transactional. Application states never dead-end silently: closure cascades notify everyone.

**Gaps:**

- **S1 — Past-dated OPEN shifts have no exit (MVP Now).** Marshal browse hides them (`app/marshal/shifts/page.tsx:31`) and `isShiftSchedulable` blocks late applications, so the trust surface is protected — but the shift stays OPEN in the database, sits in the manager's "Active" section indefinitely, and skews the founder's open-shift counts. The state machine has the needed edge (OPEN→CLOSED); nothing prompts anyone to use it. Same shape one step later: a FILLED shift past its end date awaits a completion click and nothing surfaces that either. This wants a dashboard cue ("started without booking — close it" / "awaiting completion"), not an auto-transition — auto-closing would surprise managers and auto-completing would corrupt the reliability counters. Recommendation R3.
- **S2 — Reopen-after-dropout picks the most recent acceptance (Later).** §3.12b; only wrong on multi-marshal shifts.
- **S3 — No no-show state (Later).** §3.12a; `reliabilityFlag=false` plus founder notes is the right weight for a founder-supervised beta.

## 7. Founder / manual trust ops assessment

**Adequate for the documented beta design.** Exists and verified: overview dashboard with counts; list + detail views for profiles, shifts, applications, users/managers, waitlist and support (all behind `requireFounder()`, re-checked per action in `app/actions/founder.ts:13-124`); pause/unpause on marshal profiles and shifts (pausing hides from browse, blocks new applications, and — correctly — does not tear down existing accepted bookings); `founderNote` free text on profiles, managers, shifts and support requests, never rendered to users; support queue with resolve toggle, open-first ordering, and founder email notification.

The paused flag is respected everywhere it must be: browse queries, apply/accept guards, and the marshal-side contact gate all check it.

**Gaps, all Later:** no audit log of founder actions (single-founder beta; the manual incident log covers it); no impersonation; no bulk operations; founder list views cap at 200 with no pagination (recorded as CODEBASE_REVIEW F6). None of these blocks the beta, and "rich admin tooling" is explicitly outside the boundary.

## 8. Ranked recommendations

**R1 — Wire the availability/double-booking guard into the apply flow.**
- **Problem:** T1 — booked-overlap and marked-unavailable conflicts are computed by nothing; marshals can double-book silently.
- **User affected:** marshal, manager, trust (all three).
- **Why it matters to the loop:** "Accept" must mean "this marshal will be there". A double-booking converts the product's core promise into a no-show.
- **Severity: Critical** (for the beta's purpose). **MVP: Now.** **Effort: M.**
- **Affected files:** `app/actions/hiring.ts` (apply guard), `app/marshal/shifts/[id]/page.tsx` (pre-apply warning), `lib/availability.ts` (already correct — consume it).
- **Acceptance criteria:** applying to a shift whose block overlaps an ACCEPTED booking is blocked server-side with a clear message naming the conflict; applying across a self-marked unavailable range shows a soft warning but proceeds; the shift detail page surfaces the conflict before the marshal writes a cover note; `scripts/audit_remediation_tests.ts` gains cases for both outcomes.
- **Risk of not doing it:** a real double-booking during beta — a pause-invites trigger under the trust log's own rules.
- **Do now:** yes — the helper and data model already exist; this is finishing shipped work, not new surface.

**R2 — Guard the review subject on multi-marshal shifts.**
- **Problem:** T2 — the manager's review can attach to an arbitrary accepted marshal.
- **User affected:** marshal (wrong record), manager (signal they rely on), trust.
- **Why it matters:** a corrupted reliability rating is worse than none; the whole point of stage 8 of the loop is that the signal is true.
- **Severity: High.** **MVP: Now** (given reviews are kept, §4/T3). **Effort: S.**
- **Affected files:** `app/actions/reviews.ts`, `components/ReviewForm.tsx`, `app/manager/shifts/[id]/booking/page.tsx`.
- **Acceptance criteria:** the manager's review form identifies the marshal explicitly (per-marshal form on the booking page passing `marshalId`, validated server-side as ACCEPTED on that shift); when more than one marshal is accepted and the existing `(shiftId, authorId, direction)` constraint would make a second review impossible, the action refuses with an honest message rather than mis-attributing. Full multi-review support needs a constraint change — **explicitly deferred** (schema change, §12).
- **Risk of not doing it:** first multi-marshal completed shift writes a wrong rating onto a marshal's permanent record.
- **Do now:** yes — small, and it protects the newest trust surface before real data hits it.

**R3 — Manager dashboard: pending-action roll-up and stale-shift cues.**
- **Problem:** §3.3 + S1 — no aggregate "applicants waiting" signal; past-dated OPEN shifts and end-passed FILLED shifts sit in "Active" with no prompt.
- **User affected:** manager; founder (accurate open-shift counts); status clarity.
- **Why it matters:** applicant review and completion are the two manager actions the loop stalls without; the dashboard currently announces neither.
- **Severity: High.** **MVP: Now.** **Effort: S.**
- **Affected files:** `app/manager/page.tsx` (data already loaded — this is presentation), possibly `app/manager/shifts/[id]/page.tsx` for the close prompt.
- **Acceptance criteria:** dashboard shows a summary line/badge for total pending applicants across shifts; an OPEN shift whose start has passed is visually flagged with a one-click path to close; a FILLED shift past its scheduled end is flagged "awaiting completion". No auto-transitions.
- **Risk of not doing it:** slow manager responses make the product feel worse than WhatsApp — the exact comparison it must win.
- **Do now:** yes — cheap, contained, directly measured by the founder's first-shift checklist.

**R4 — Narrow the applicant-page queries so pre-acceptance contact is never fetched.**
- **Problem:** T4 — `include: { marshal: … }` loads email/phone on pages that must never show them.
- **User affected:** trust.
- **Why it matters:** the contact-release invariant currently depends on render-site discipline; `select` makes it structural.
- **Severity: Medium** (latent). **MVP: Now.** **Effort: S.**
- **Affected files:** `app/manager/shifts/[id]/applicants/page.tsx`, `app/manager/shifts/[id]/applicants/[appId]/page.tsx`.
- **Acceptance criteria:** neither page's Prisma query selects `email` or `phone`; both pages render identically; the contact-release re-check (§11) passes.
- **Risk of not doing it:** a future innocuous refactor leaks contact pre-acceptance — the single worst trust failure the product can have.
- **Do now:** yes — near-zero risk, permanent structural gain.

**R5 — Enrich the decision notifications with shift facts.**
- **Problem:** §3.14 — accept/reject/new-applicant messages omit dates, times, location and (for phoneless marshals) a nudge.
- **User affected:** marshal primarily; manager (new-applicant message); operational usefulness.
- **Severity: Medium.** **MVP: Now.** **Effort: S.**
- **Affected files:** `app/actions/hiring.ts:113-120, 329-330, 374-375` (bodies already built alongside `formatShiftBlock`-style helpers in `lib/format.ts`).
- **Acceptance criteria:** the acceptance notification/email states production, date block, daily times and location; rejection names the shift and dates; the manager's new-applicant message includes the count now pending; no message contains the other party's contact details (re-verified); if the accepted marshal has no phone on file, the acceptance flow tells them managers expect one.
- **Risk of not doing it:** marshals fall back to asking details over WhatsApp — the habit the product exists to replace.
- **Do now:** yes — copy-only, high visibility per unit effort.

**R6 — Waitlist thanks-page expectation line.** Severity: Low. **MVP: Later.** One sentence on response timescale; do it whenever the file is next touched.

**R7 — Applicant list sorting/filtering; bulk actions.** **Later** — real at volume, absent problem at beta scale, adjacent to CRM drift.

**R8 — Dedicated no-show state and dropout-selection UI (S2/S3).** **Later** — founder supervision plus `reliabilityFlag` covers the beta; build only if a real incident shows the manual path failing.

**R9 — Finish shift alerts.** **Do not do.** Park as Later/Noise (T3); functionally saved-search + a new notification type, both outside the boundary.

## 9. Proposed implementation batch (3–5 changes)

**Batch: R1, R2, R3, R4, R5.** All five sit inside the existing loop, need no schema changes, no dependency changes, and no new pages (R1's warning and R2's per-marshal form render on existing pages).

- **Why these:** R1 and R2 close the two live trust defects in already-shipped surface; R3 unblocks the two manager actions the loop stalls without; R4 makes the contact invariant structural; R5 makes the loop's outputs actionable. Every change is directly testable against the founder's existing per-shift checklist.
- **Why not the rest:** R6 is trivial but touches the public marketing surface for no loop gain; R7/R8 solve problems the beta does not yet have; R9 is drift.
- **Affected workflows:** apply (R1), review-after-completion (R2), manager dashboard/attention (R3), applicant review (R4), accept/reject notifications (R5).
- **Expected files:** `app/actions/hiring.ts`, `app/actions/reviews.ts`, `app/manager/page.tsx`, `app/manager/shifts/[id]/applicants/page.tsx`, `app/manager/shifts/[id]/applicants/[appId]/page.tsx`, `app/manager/shifts/[id]/booking/page.tsx`, `app/marshal/shifts/[id]/page.tsx`, `components/ReviewForm.tsx`, `scripts/audit_remediation_tests.ts` (new cases), possibly `lib/copy.ts`/`lib/format.ts` (shared strings).
- **Acceptance criteria:** per recommendation, §8.
- **Risks and rollback:** R1 is the only behavioural gate being added — the risk is over-blocking (a false-positive overlap stops a legitimate application); mitigate by matching the helper's documented semantics exactly (hard block only on ACCEPTED-booking overlap) and covering it in `test:remediation`. R2 risks refusing a review a manager expected to leave on multi-marshal shifts — an honest refusal, correct until the constraint changes. R3/R5 are presentational/copy. R4's only failure mode is a missed field breaking a render — caught by build + page check. All five are working-tree edits with no migration: rollback is `git checkout` of the touched files.
- **Not implemented in this run**, per the task's stop condition.

## 10. Explicit Later / Noise list

| Item | Class | Reason |
|---|---|---|
| Payments / payroll | Noise | Excluded on the landing page itself; enormous surface. |
| In-platform messaging | Noise | Excluded by design; contact release *is* the communication handoff. |
| AI matching | Noise | Trust comes from the manager's judgement, not a ranker. |
| Public ratings / social features | Noise | Loop-internal reviews (kept) are the boundary; public reputation is not MVP. |
| Broad marketplace search / filters | Later | Beta volume makes lists scannable; revisit at real volume. |
| Shift alerts / saved searches | Later (park) | Unwired scaffolding today (T3); a new notification type, against the beta rule. |
| Open contact directories | Noise | Direct contradiction of the core invariant. |
| Identity verification / background checks | Later | Founder-mediated invites are the beta's identity layer. |
| Manager team accounts | Later | Single-manager beta; real need unproven. |
| Advanced scheduling / calendar tooling | Later | The availability calendar stays minimal: blocks + conflict guard only (R1). |
| CRM pipelines, bulk applicant actions | Later | §8 R7. |
| Rich admin tooling, audit log, impersonation | Later | §7; manual incident log suffices for one founder. |
| Mobile app | Noise | Responsive web is the surface. |
| Referral / invite-tracking systems | Later | Manual invites are the documented design. |
| Broad marketing features | Noise | Waitlist + manual outreach is the funnel. |
| No-show state machine | Later | §6 S3. |
| Onboarding walkthroughs, role switching | Later | Empty states carry onboarding at this scale. |
| Rate limiting, Next.js upgrade, GDPR expansion, BST fix, pagination | (Security/ops) | Owned by [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md) F1–F12 — not product scope, not re-ranked here. |

## 11. Verification plan for the proposed batch

When the batch is implemented (a later, explicitly approved run):

1. `npm run build` — clean compile.
2. `npm run test:remediation` — including new pure-function cases for the apply-conflict outcomes (R1) and review-subject resolution (R2).
3. **Contact-release re-check** (mandatory — the batch touches applicant, booking and shift pages): pre-acceptance, applicant list/detail render no email/phone and (post-R4) do not fetch them; post-acceptance, booking page and marshal application page render them; rejected/withdrawn/sibling applicants never do; no notification body (post-R5) contains contact details.
4. **Workflow walkthroughs** on seeded data: apply blocked on overlapping ACCEPTED booking with clear copy; soft warning on self-marked unavailability; manager review on a 2-marshal COMPLETED shift attaches to the chosen marshal or refuses honestly; dashboard shows pending roll-up, stale-OPEN flag, awaiting-completion flag; accept/reject notifications carry dates/times/location.
5. `npm run db:smoke` — **only if explicitly approved for that run** (it writes to the database); its acceptance-flow sections cover the invariants R1 touches.
6. `git diff` review against the expected-files list in §9; `git status` for strays.

For **this review-only run**, verification is: `git status`/`git diff` confirming this document is the only change, plus `npm run build` (safe; `prebuild` only regenerates the gitignored `src/generated/version.ts`).

## 12. Open questions and assumptions

1. **Missing product-authority documents.** Product Context Master, MVP Roadmap, Hard MVP Boundary, Shift Posting Schema, Marshal Profile Schema, Core Workflow States and Transitions, Trust and Ops Playbook, and Legal and Compliance Brief do not exist in this repository. This review substituted the landing-page scope statement, schema comments, and the `docs/` beta dossier. If those documents exist elsewhere and diverge, the classifications here should be re-checked against them.
2. **Intended status of the newly landed features.** Reviews, availability and alerts postdate the cutover's out-of-scope declaration (they landed in `30858a8`). This review assumes reviews + availability are sanctioned Sprint-4-style work to be finished (positions in §4/T3) and alerts are an experiment to park. **The founder should confirm before the batch runs**, since R1 and R2 build on that assumption.
3. **Multi-marshal shifts in the beta.** Several Later classifications (S2, R2's constraint deferral) assume `marshalsNeeded > 1` is rare in the first invite batch. If multi-marshal shifts are expected early, R2's full fix (a schema constraint change) rises in priority.
4. **Review edit/delete policy.** Reviews are write-once with no correction path. Acceptable at beta scale (the founder can fix rows manually), but a wrong-but-honest review currently has no remedy; worth a policy decision before reviews accumulate.
5. **Phone-optional contact release (T5).** Assumed acceptable to solve with copy (R5) rather than making phone required, which would add signup friction. Confirm.
6. **BST timezone caveat.** All temporal guards this review relies on (publish, apply, complete, withdraw) share the known one-hour BST skew (CODEBASE_REVIEW F5). The batch does not fix it (security/ops ownership) but R1's overlap checks operate on date blocks and are unaffected at day granularity.
