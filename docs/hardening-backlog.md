# Hardening backlog

Accepted caveats only. This is **not** Sprint 4 and **not** a feature list. Do not begin items here unless they actively block controlled beta use.

Each item must answer: *what trust gate or operational risk does this protect?* If the answer is "none", it does not belong here — it is a feature idea and goes nowhere.

## Status legend

- 🅿 parked — accepted caveat, monitored only
- 🟡 ready — confirmed needed, waiting for an open trust gate to justify the work
- 🔴 active — currently blocking controlled beta use; repair in progress

## Items

### 🟡 APP_BASE_URL must point at the live deployment in production

The production env snapshot has `APP_BASE_URL="http://localhost:3000"`. This is fine in dev, but in production it makes the founder support-notification email link broken (`http://localhost:3000/founder/support`). The notification still arrives at `admin@marshalhq.com`; the link inside it does not work.

**Trust gate it protects**: support response time. A founder who cannot click straight from the alert into the support queue is slower to respond.

**Action**: in the Vercel dashboard, set `APP_BASE_URL` to the production URL for the Production environment, redeploy, and re-test by submitting a support request and clicking the link in the founder notification.

**Source**: [app/actions/recovery.ts:268](../app/actions/recovery.ts).

---

### 🅿 Dedicated QA Supabase / Postgres project

Right now the QA seed data and the live data live in the same Postgres database, separated only by email domain (`@example.com` vs the founder/real users). The contamination scanner ([scripts/qa_contamination_scan.ts](../scripts/qa_contamination_scan.ts)) keeps it manageable, but a dedicated QA project would remove the risk class entirely.

**Trust gate it protects**: data hygiene. A QA run cannot touch a live row if QA is on a separate database.

**Action when justified**: create a second Postgres project in the same provider, point local dev and CI at it, leave the live Postgres for the controlled beta only.

---

### 🅿 Live past-shift fixture for withdrawal-after-start QA

QA can already cover the withdraw path on a future-dated FILLED shift, but cannot reproduce the "marshal tries to withdraw after the shift has started" guard against live data without time travel. Currently covered by the smoke test ([prisma/smoke.ts](../prisma/smoke.ts), section D).

**Trust gate it protects**: the temporal withdraw guard. Smoke covers it; manual QA does not.

**Action when justified**: schedule a fixture script that creates a shift starting in the next 30 seconds, then test the guard once it crosses the start time.

---

### 🅿 Apex-to-www redirect

Belt-and-braces redirect at the DNS / Vercel layer so users who type `marshalhq.com` and `www.marshalhq.com` land on the same canonical host. Reduces support questions about "the link in the email goes to a different place".

**Trust gate it protects**: email link integrity. Canonical host = predictable email links = lower confusion in account recovery.

**Action when justified**: add the redirect in Vercel domain settings (or DNS), verify via password reset email click-through.

---

### 🅿 Next.js security advisory review

Track Next.js security advisories against the pinned `14.2.18` version. Currently on 14.2.x; no known unpatched issues at time of cutover. Re-check before major version bumps.

**Trust gate it protects**: known-vulnerability exposure on the public surface (login, signup, support).

**Action when justified**: subscribe to the GitHub security advisories for `vercel/next.js`, schedule a quarterly check.

---

### 🅿 Edge-safe auth split (only if needed)

The middleware imports `@/lib/auth` and `@/lib/access`. If the middleware ever needs to run at the edge without Node APIs, this could be split into an edge-safe shim. Not currently required because the middleware runs in the Node runtime by default in this Next.js version.

**Trust gate it protects**: founder gate latency. Only relevant if edge runtime is forced.

**Action when justified**: split when (and only when) the middleware needs to run at the edge.

---

### 🅿 Orphaned QA account cleanup automation

`npm run qa:scan -- --fix` covers the known contamination patterns: reserved-email signups (deleted if recent and not pre-provisioned) and contact-leak free-text (paused, not deleted). What it does not cover is an account that was real-but-test (e.g. a `@example.com` account that survived a previous QA cycle). For now those are caught manually via [scripts/mhq_list_users.ts](../scripts/mhq_list_users.ts).

**Trust gate it protects**: applicant pool integrity in beta. A real manager seeing `alex@example.com` in their applicant list breaks trust.

**Action when justified**: add an `@example.com` filter to the cleanup pass once a real founder pass has confirmed the legitimate user list.

---

### 🅿 DMARC tightening after clean email data

Once the email setup has been running clean against `admin@marshalhq.com` for the beta window, tighten the DMARC policy from monitoring (`p=none`) to enforcement (`p=quarantine` then `p=reject`). Premature tightening risks suppressing the password reset email during a real recovery.

**Trust gate it protects**: deliverability of password reset and support confirmations.

**Action when justified**: review DMARC report data after the first clean beta cycle, then tighten in steps with founder watching the reports.

---

## Out of scope (do not promote to this list)

The following are **not** hardening items and must not be moved into this backlog:

- payments, in-platform messaging, AI matching, analytics, advanced search
- richer reputation, identity verification, public ratings, team accounts
- mobile app, complex admin dashboard, formal dispute workflow
- profile photo upload, manager profile editing, visual redesign
- public launch copy, testimonials, marketing expansion, onboarding campaigns
- broad invite system, new marketplace features

If a beta finding maps to one of these, it is a "later improvement" in [post-shift-feedback.md](post-shift-feedback.md), not a hardening item.
