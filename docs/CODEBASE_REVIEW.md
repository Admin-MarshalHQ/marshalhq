# Marshal HQ — Codebase Review & Recommendations

_Senior full-stack and application-security review. Assessment only — no application code was changed. Prepared 2 July 2026 against the working tree on `main` (which carries substantial uncommitted work on the availability and reviews features)._

British English throughout. Every asserted finding below was verified from the code or command output in this review session. Items that could not be confirmed from the repository are listed separately under **Open questions / needs verification** and are never asserted as fact.

---

## 1. Executive summary

Marshal HQ is a Next.js 14 (App Router) two-sided staffing product for UK film and TV location marshals: managers post structured shifts, marshals build profiles and apply, managers accept one applicant, and contact details are released only after acceptance. It runs on NextAuth v5 (JWT, credentials provider), Prisma 5 against a Supabase Postgres database, Resend for email, and deploys on Vercel. The application's **core trust model is genuinely well built**: the contact-release invariant is enforced defensively at every render site, authorisation is applied in depth (middleware plus per-page `requireRole`/`requireFounder` and per-action re-checks), booking acceptance is transactional, passwords are bcrypt-hashed, and reset/verification tokens are SHA-256-hashed, single-use and time-limited. Secrets have **never** been committed to git history (verified). The most material risks are therefore not in the bespoke business logic but in the platform and operational envelope: the pinned Next.js version (14.2.18) carries a critical advisory stack including the middleware authorisation-bypass CVE and several DoS/SSRF issues; there is no rate limiting anywhere on the authentication surface; and it cannot be confirmed from the repository that the production `AUTH_SECRET` differs from the checked-in development placeholder — which, if true, would be critical. The product is credibly **controlled-private-beta ready**, but not public-launch ready. The three things to fix first are below.

## 2. Fix first (exactly three)

1. **Confirm and, if needed, rotate the production `AUTH_SECRET`.** The value in the local `.env` is the literal placeholder `dev-secret-please-change-in-production-…`. If that same value is live on Vercel, anyone who reads this repo can forge session JWTs and impersonate any user — including a founder. This is cheap to verify and, if unset, is the single highest-consequence issue. (See F3.)
2. **Upgrade Next.js off 14.2.18.** `npm audit --omit=dev` returns a **critical** finding for `next`, including "Authorization Bypass in Next.js Middleware" (CVE-2025-29927) and multiple DoS/cache-poisoning/SSRF advisories. Page-level guards blunt the authz impact here, but the framework should not be left on a known-exploitable release. (See F1.)
3. **Add rate limiting to the authentication surface.** Login, signup, password-reset request, verification resend and the public waitlist have no throttling of any kind (no limiter dependency is installed). Invite-only beta contains the blast radius, but this must exist before the surface is public. (See F2.)

## 3. Findings

Severity is deliberately conservative. Strengths that were verified (contact-release integrity, in-depth authz, transactional booking, token hygiene) are **not** listed as findings; they are summarised in §8.

| # | Finding | Dimension | Severity | Beta impact | Effort | Location(s) | Evidence | Recommendation |
|---|---------|-----------|----------|-------------|--------|-------------|----------|----------------|
| F1 | Next.js 14.2.18 carries a critical advisory stack: middleware authz bypass (CVE-2025-29927), plus DoS/cache-poisoning/SSRF and an image-optimizer `remotePatterns` DoS advisory. Page/layout `auth()` re-checks limit the authz-bypass blast radius (the email-verification gate is the main middleware-only control), but the framework is knowingly on a vulnerable release. | Security / Supply chain | High | Pre-public-launch blocker | M | `package-lock.json` (`next@14.2.18`); `middleware.ts` is the sole email-verification gate | `npm audit --omit=dev` → `next … Severity: critical`, advisory list includes *Authorization Bypass in Next.js Middleware*; `npm outdated` → next current 14.2.18, latest 14.2.x/15.x | Upgrade to the latest 14.2.x patch (≥ 14.2.25 fixes the bypass; take the newest patch for the rest) or plan the 15.x bump. Re-run `npm audit` to confirm clearance. |
| F2 | No rate limiting on any auth or public-write surface. Credentials provider runs `bcrypt.compare` per attempt with no throttle; reset/verification/waitlist are unauthenticated POST server actions. Enables brute force, user enumeration and email-bombing at scale. | Security | High | Pre-public-launch blocker | M | `lib/auth.ts:31-45`; `app/actions/recovery.ts`, `app/actions/verification.ts`, `app/actions/waitlist.ts`; `grep` for limiter deps → none | `grep -iE "ratelimit\|upstash\|@vercel/kv\|limiter" package.json` → `NONE` | Add an IP+identifier throttle: Vercel WAF/rate rules at the edge, or an in-action token bucket (e.g. `@vercel/kv`/Upstash). Cap login, reset-request, resend and waitlist. |
| F3 | Production `AUTH_SECRET` cannot be confirmed to differ from the dev placeholder. If the placeholder is live, JWTs can be forged → full account/founder impersonation. | Security | Needs verification (Critical if confirmed) | Beta blocker if confirmed | S | `.env` (`AUTH_SECRET="dev-secret-please-change-in-production-…"`); consumed by `lib/auth.ts` via NextAuth | Placeholder value present on disk; production value not readable from repo | Verify the Vercel production `AUTH_SECRET` is a strong unique value; rotate if not. Treat as fix-first (§2.1). |
| F4 | `images.remotePatterns` allows every HTTPS host (`hostname: "**"`), and no security headers (CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are configured. Intersects the Next image-optimizer DoS advisory in F1. | Security hardening | Medium | Pre-public-launch blocker | S | `next.config.js` (`remotePatterns` wildcard; no `headers()`) | Read of `next.config.js`; wildcard confirmed | Restrict `remotePatterns` to the actual image host(s); add a `headers()` block with a baseline security-header set. Quick win. |
| F5 | Shift start/end/withdrawal gates compute instants with server-local `setHours()`. Vercel runs UTC; shift times are entered as UK local, so during BST (in effect now) the completion trust-invariant, apply-eligibility and withdrawal cutoff are off by one hour. | Correctness | Medium | Hardening backlog | M | `lib/state.ts:73` (`canCompleteShift`), `lib/state.ts:87` (`shiftStartDateTime`); also `app/marshal/applications/[id]/page.tsx:110-116` | Both use `setHours()`; `formatShiftBlock` deliberately uses UTC (`lib/format.ts:26-32`), so day rendering and instant computation disagree | Compute shift instants explicitly in `Europe/London`, or store true timestamptz values. Single shared helper. |
| F6 | Unbounded `findMany` on five list pages — no `take`/pagination. `manager/market` is user-facing (any manager); the founder lists are admin-only. Loads the whole table as data grows. | Performance | Low (Medium at scale) | Hardening backlog | S | `app/founder/users/page.tsx:6`, `app/founder/managers/page.tsx:6`, `app/founder/profiles/page.tsx:8`, `app/founder/support/page.tsx:7`, `app/manager/market/page.tsx:10` | `grep findMany`/`take:` — these five have no `take`; other lists cap at 200/100 | Add `take` + cursor/offset pagination. Prioritise `manager/market` (user-facing). |
| F7 | Privacy page is accurate for beta but insufficient for public launch: no named controller, no subprocessors (Supabase/Resend/Vercel), no lawful basis, no retention periods, only deletion among DSAR rights, no international-transfer basis. `founderNote` internal notes are personal data with no DSAR/deletion tooling (manual only). | Data protection (UK GDPR) | Medium | Pre-public-launch blocker | M | `app/privacy/page.tsx:1-56`; `founderNote` on `prisma/schema.prisma` (ManagerProfile, MarshalProfile, Shift, SupportRequest); deletion = manual `SupportRequest` category | Read of privacy page and schema; deletion described as manual at `privacy:27-37` | Expand the policy (controller, subprocessors, lawful basis, retention, full rights, transfers). Document a manual DSAR/deletion runbook covering `founderNote` and shift/application history. |
| F8 | Production dependency on a beta auth library (`next-auth@5.0.0-beta.25`) with a moderate advisory (email misdelivery); `@auth/core` also flagged as outdated. | Supply chain | Medium | Hardening backlog | S–M | `package-lock.json` (`next-auth@5.0.0-beta.25`, `@auth/core@0.41.2`/`0.37.2`) | `npm audit` → `next-auth … NextAuthjs Email misdelivery Vulnerability (moderate)`; `npm outdated` confirms betas | Track to a stable v5 line when released; in the interim bump to the latest beta and re-audit. Record the beta-dependency risk explicitly. |
| F9 | Operational maturity gaps: no CI, no test runner (custom `tsx` assertion scripts only), no tracked Prisma migrations (`db push` only → no rollback path), and QA shares the production database. | DevOps / Operational | Medium | Hardening backlog | M–L | No `.github/workflows/`; `package.json` scripts (`test:remediation`, `db:smoke`, `db:push`); no `prisma/migrations/` | Directory/script inspection; shared-DB item already parked in `docs/hardening-backlog.md` | Add a CI job (build + `test:remediation` + `npm audit`); adopt `prisma migrate` for a rollback path; separate the QA database (already a parked backlog item — credit, don't re-scope). |
| F10 | Secrets live in `.env` on disk (live Supabase URL, live Resend API key, placeholder `AUTH_SECRET`). Confirmed **never committed** to git history. Residual risk is disk exposure + rotation hygiene, not repo leakage. | Security / Secrets | Medium | Hardening backlog + Needs verification | S | `.env`; `.gitignore:4` (`.env`) | `git log --all -p -S '<Resend key prefix>'` and `-S 'postgresql://postgres'` → **empty** (never committed); `git log --all -- .env` → empty | Keep production secrets in Vercel env only. Rotate the Resend key (it has sat in a working-copy file). Pairs with F3. |
| F11 | `emailVerifiedAt DateTime? @default(now())` auto-verifies any User row created without an explicit override. Signup correctly overrides to `null`, so no active bypass — but it is a footgun for seeds/scripts/future code paths. | Security hardening | Low | Hardening backlog | S | `prisma/schema.prisma:22`; overridden at `app/actions/auth.ts:72` | Read of schema + signup action | Drop the `@default(now())`; set `emailVerifiedAt` only on actual verification. Quick win. |
| F12 | `photoUrl` accepted any URL (`z.string().url()` admits `http:`/`javascript:`). Rendered only on the marshal's **own** profile (not shown to managers) — via `next/image` at review time, switched to a plain `<img>` in Hardening Batch 1 — so exposure was self-only mixed-content/tracking. | Security hygiene | Low | Hardening backlog — **implemented in Batch 1** | S | `lib/zod.ts:132-138`; rendered at `app/marshal/profile/page.tsx`; not rendered in `manager/market` | `grep photoUrl` across `app/` — single render site | **Done (Batch 1):** schema now requires `https://` URLs; render is a plain `<img>` so the image optimizer no longer fetches user-supplied hosts. |

## 4. Severity classification (per finding)

| Classification | Findings |
|---|---|
| **Beta blocker** | F3 *(only if the production `AUTH_SECRET` is confirmed to be the placeholder)* |
| **Pre-public-launch blocker** | F1, F2, F4, F7 |
| **Hardening backlog** | F5, F6, F8, F9, F10, F11, F12 |
| **Needs verification** | F3, F10 (production secret values), plus the items in §9 |

Severity counts asserted in the table: **0 Critical**, **2 High** (F1, F2), **6 Medium** (F4, F5, F7, F8, F9, F10), **3 Low** (F6, F11, F12), **1 Needs verification** (F3). _Note: F3 would be Critical if confirmed; it is held at Needs verification because it cannot be established from the repository._

## 5. Acceptance criteria (Critical & High items)

**F1 — Next.js upgrade**
- `next` is on a release where `npm audit --omit=dev` reports no `next` advisory (target latest 14.2.x, minimum 14.2.25 for the middleware bypass).
- `npm run build` succeeds and a smoke pass (`db:smoke`) is green post-upgrade.
- Middleware role/founder/verification gating and one manager→marshal booking flow verified working after the bump.

**F2 — Rate limiting**
- Login, password-reset request, verification resend and waitlist submission each reject beyond a defined threshold per IP+identifier within a window, returning a neutral, non-enumerating response.
- Limits are configurable and logged; legitimate flows (normal login, one reset) are unaffected.
- A scripted burst against each endpoint is throttled (demonstrable in a test or manual check).

**F3 — Production `AUTH_SECRET`**
- Confirmed that the Vercel production `AUTH_SECRET` is a unique, high-entropy value distinct from the dev placeholder.
- If it was the placeholder: secret rotated, all existing sessions invalidated, and rotation recorded in the incident log.

## 6. Action plan

**Now** (before the next invite batch)
- F3 — verify/rotate production `AUTH_SECRET` (minutes; highest consequence-if-true).
- F10 — rotate the Resend key and confirm production reads secrets from Vercel env, not `.env`.
- F1 — schedule and apply the Next.js patch upgrade (unblocks F4's image-optimizer concern too).

**Next** (before opening beyond invite-only)
- F2 — rate limiting on the auth/public-write surface.
- F4 — restrict `images.remotePatterns` and add security headers (quick win; do alongside F1).
- F7 — expand the privacy policy and write the manual DSAR/deletion runbook.

**Later** (hardening as the beta stabilises)
- F5 — timezone-correct shift instants.
- F9 — CI, `prisma migrate`, QA/production database separation (credit the parked backlog item).
- F6 — pagination on the five unbounded lists (prioritise `manager/market`).
- F8 — track `next-auth` to a stable line.
- F11, F12 — schema quick wins (`emailVerifiedAt` default, `photoUrl` https).

**Noise / do not build**
- No new features are warranted by this review: no payments, messaging, analytics, AI, public ratings, social/community features, marketplace expansion, or richer admin tooling. None of these reduces a verified security, legal, trust or operational risk, and several would *enlarge* the trust surface during a controlled beta.
- Do not add a Web Application Firewall product or SIEM tooling at this stage; the rate-limiting need (F2) is met by a lightweight throttle.

## 7. Quick wins (each < half a day)

- **F4** — restrict `remotePatterns` to the real image host and add a `headers()` block (`next.config.js`).
- **F11** — drop `@default(now())` from `emailVerifiedAt` (`prisma/schema.prisma:22`).
- **F12** — constrain `photoUrl` to `https:` (`lib/zod.ts:132-135`).
- **F6 (partial)** — add a `take:` cap to the five unbounded lists as an interim measure before full pagination.
- **F10 (partial)** — rotate the Resend key.

## 8. Verified strengths (context, not findings)

These were checked in the code this session and are working as intended; they are recorded so future work does not "fix" them or mistake them for gaps:

- **Contact-release integrity holds.** Manager sees marshal contact only on the booking page after acceptance (`app/manager/shifts/[id]/booking/page.tsx:35-38, 137-138`); marshal sees manager contact only behind a re-checked accepted-pair guard (`app/marshal/applications/[id]/page.tsx:71-98, 232`); the applicant-review page renders no contact at all (`applicants/[appId]/page.tsx`); founder pages that show contact sit behind `requireFounder()`. Sibling/rejected/withdrawn applicants never match the accepted-pair guard.
- **Authorisation in depth.** Founder area guarded at layout level (`app/founder/layout.tsx` → `requireFounder()`); every manager/marshal page calls `requireRole()`; `/settings` and `/notifications` `redirect("/login")` on a null session; every founder server action re-checks `requireFounder()` (`app/actions/founder.ts:17,27,41,60,79,99,117,127`). Ownership is re-verified inside actions/pages (e.g. `shift.managerId !== user.id → notFound()`), not trusted from the URL.
- **Booking is transactional** with CAS-style status guards (per `app/actions/hiring.ts` accept flow), preventing double-booking.
- **Token hygiene** — bcrypt(10) passwords; SHA-256-hashed, single-use, TTL-bounded reset/verification tokens.
- **Secrets never entered git history** (verified via `git log -S`).

## 9. Open questions / needs verification

These are credible but could not be confirmed from the repository, and are deliberately kept out of the asserted findings:

- **Production `AUTH_SECRET`** — is the live Vercel value the dev placeholder? (F3; would be Critical.)
- **Supabase / Prisma data-access boundary** — Prisma connects via `DATABASE_URL`/`POSTGRES_URL` as a privileged Postgres role through the pooler (`lib/db.ts`, `.env`). This path **bypasses any Supabase Row-Level Security**, so app-layer authorisation is effectively the *only* data boundary. That is acceptable given the verified in-depth checks (§8), but it should be a conscious, documented decision. Needs verification: is RLS enabled at all, and is anything expected to rely on it?
- **Subprocessor DPAs and data residency** — Supabase, Resend and Vercel regions/DPAs for UK GDPR (F7). Not determinable from code.
- **Backups** — Supabase backup/retention posture and a tested restore. Not in the repository.
- **`APP_BASE_URL`** — still `http://localhost:3000` in the local env; production value must be the live URL for correct email links (already parked in `docs/hardening-backlog.md`).
- **DMARC** — currently `p=none` per the hardening backlog; enforcement deferred.

## 10. Overlap with `docs/hardening-backlog.md`

Several points here intersect items **already parked** by the team; credit to the existing backlog, not new discoveries:

- **QA/production database separation** — parked ("Dedicated QA Postgres project"). Reflected in F9; no re-scoping.
- **`APP_BASE_URL` in production** — marked ready in the backlog; noted in §9.
- **Next.js advisory tracking** — the backlog tracks Next.js advisories generally; F1 sharpens this into a specific, currently-actionable upgrade with an audit-confirmed critical rating.
- **DMARC enforcement** and **orphaned QA account cleanup** — parked; noted in §9 and F9 respectively.

The net-new, verified items this review adds beyond the parked backlog are: the auth-surface rate-limiting gap (F2), the `AUTH_SECRET` production-hygiene question (F3), the wildcard image `remotePatterns` + missing headers (F4), the BST timezone gating bug (F5), the five unbounded list queries (F6), the public-launch privacy/GDPR gaps and DSAR-for-`founderNote` tooling (F7), and the `emailVerifiedAt` default footgun (F11).
