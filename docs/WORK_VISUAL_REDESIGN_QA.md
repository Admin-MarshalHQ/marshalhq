# MarshalHQ visual redesign review

**22 November 2026 · Ready for founder visual review.** This branch implements the reference direction across the homepage, manager and marshal workspaces and their connected screens. Production was inspected read-only. All authenticated screenshots and actions below used an isolated PostgreSQL database with synthetic accounts and shifts.

| Revision | Identifier |
|---|---|
| Main baseline | `a786bf08ca188b0f717a18c9adde882d28e2250d` |
| Local application revision under test | `91b7472f72fdbcb13719004f6c5c3fe22fb8de98` |
| Corresponding GitHub application commit | `2a8817f0eff602d759b5c8bcff991a0b249dbeb3` |
| Application tree verified identical on local and GitHub | `650d43220f3d386b0e0a3c23cba2b7f0ae97324e` |
| Branch | `feat/work-visual-redesign-reference-v1` |

## Implementation

- **Public homepage and waitlist.** The reference's warm split hero, bold italic accent, role links and three benefit tiles lead to the existing waitlist intake. The email-first entry still prefills the full form. The example card is labelled beside its title. The waitlist confirmation, privacy, terms, platform rules and support use the same styling.
- **Workspace.** A role-specific rail at 1024px and above, horizontal navigation at tablet widths, and role-specific bottom tabs below 768px. The top bar keeps genuine inbox and account links. Legal links, sign-out and the build identifier are available in the footer.
- **Marshal experience.** Available shifts use date tiles and icon-led location, dates, hours and pay. Shift detail puts these facts before duties, travel and the in-flow application. The dashboard puts an accepted booking and its drill-down above the actual counts. Application tracking, profile, availability and completion history inherit the shared layout, labels and control styles.
- **Manager experience.** Production dashboard keeps the attention queue above real totals and active/past shifts. Applicant review uses full-width candidate rows with practical suitability, user-reported training and completed-work counts. Paused profiles and filled shifts no longer inflate reviewable counts. Draft and publish remain separate, and all destructive lifecycle and application decisions keep their confirmation.
- **Shared UI.** Self-hosted Fontsource Inter and Fraunces Latin variable fonts (version 5.3.0, SIL OFL licences included), common tokens and outline icons, semantic status labels, keyboard-focus outlines, labelled form fields and errors, 44px shared actions, 48px text controls, a skip link, a native confirmation dialogue and mint contact-release panels. Login, signup, verification, recovery, moderation, settings, support and system states use these shared styles.

## Rendered evidence

`MarshalHQ-Visual-Redesign-Evidence.zip` contains the full-page Chromium screenshots, an HTML index, measurements, accessibility results, semantic snapshots, test output and the isolated fixture and browser scripts. Screenshot names are `before/<screen>-<width>.jpg` and `after/<screen>-<width>.jpg`. The baseline set covers all six screens at 390 and 1440. The redesign adds the full matrix and 22 check captures for related screens. These are rendered routes of the actual application. Names beginning with “QA” and all fixture contacts are synthetic.

| CSS width | Homepage | Discovery | Shift detail | Marshal dashboard | Manager dashboard | Applicant review |
|---:|---|---|---|---|---|---|
| 320 | Pass | Pass | Pass | Pass | Pass | Pass |
| 375 | Pass | Pass | Pass | Pass | Pass | Pass |
| 390 | Pass | Pass | Pass | Pass | Pass | Pass |
| 430 | Pass | Pass | Pass | Pass | Pass | Pass |
| 768 | Pass | Pass | Pass | Pass | Pass | Pass |
| 1024 | Pass | Pass | Pass | Pass | Pass | Pass |
| 1440 | Pass | Pass | Pass | Pass | Pass | Pass |

A matrix pass means the intended route rendered its heading and a single main landmark, with document width at or below the viewport. Representative mobile and desktop screenshots were inspected for hierarchy, wrapping, active navigation, applicant rows and contact panels. The separate 200% root-text-size check covered the homepage, shift detail and applicant review at 720 CSS pixels. A pass here is limited to the recorded Chromium runs.

## Test results

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | Exit 0 |
| `npm run build` and `tsc --noEmit`, baseline and redesign | Both exit 0 against disposable loopback PostgreSQL. No separate lint script is configured. |
| `node --import tsx scripts/audit_remediation_tests.ts` | 80/80 pass on each checkout. The direct `npm run test:remediation` launcher hit a workspace Unix-socket restriction. The Node import ran the same script. |
| `node --import tsx prisma/smoke.ts` | 18/18 pass on each checkout. This suite writes and resets its own test records on the isolated database. |
| Chromium visual and workflow run | Exit 0. 76 screenshots, 13 interaction and trust groups, 17 axe scans with zero reported violations and zero page errors. |
| Keyboard and semantics | Skip link, mobile menu, signup radios, labelled confirmation, Escape, focus containment and return passed. Semantic snapshots and reduced-motion check included. |
| Colour contrast using WCAG sRGB relative luminance | White on action coral 5.49:1, navy on cream 16.87:1, secondary slate on cream 7.16:1, form boundary on white 4.01:1 and dark green on mint 6.29:1. |
| Git comparison | `git diff --check` passes. Actions, middleware, auth, access, validation, state functions, schema, dependencies, both protected contact routes and applicant-detail guards are byte-identical to the baseline. |

[WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Trust regression checks

| Path | Evidence |
|---|---|
| Role, ownership and email verification | Unauthenticated redirect, cross-role redirect, unverified redirect, founder denied to manager and another manager denied applicant and booking detail. Denied detail rendered the app’s not-found UI. Next.js can return 200 when that UI is streamed. |
| Posting and applying | Manager saved a real draft and published through confirmation. The draft was hidden from the marshal. A marshal applied via the rendered form and saw the real record. Multi-day schedule, daily and hourly rates, paused and past shifts, missing or paused profiles, unavailability and booking conflicts were exercised. |
| Before acceptance | Raw document responses and DOM checked for the synthetic counterpart’s contact on shift detail, manager shift, list and applicant detail, and marshal application detail. Contact absent. |
| After acceptance | Manager and marshal saw the expected contact on the protected booking and application routes. A second tab’s stale confirmation was refused after a single remaining slot filled. Sibling applicants remained `Applied` and could not see manager contact. |
| Multi-slot and withdrawal | First of two bookings left the shift open and released contact only to the accepted pair. Second booking filled the shift. An accepted marshal dropping out revoked their access, reopened the place and preserved the other accepted booking. |
| Close and complete | Pending withdrawal, explicit rejection, closure, no early completion control, elapsed-end completion and marshal history were exercised. Completion used a separate seeded shift whose end had elapsed. |
| Notifications and waitlist | Inbox showed workflow-generated records. The waitlist’s prefill and submission reached confirmation against local intake data. The mail provider was unconfigured. External email delivery was not exercised. |

[Next.js 14 not-found convention](https://nextjs.org/docs/14/app/api-reference/file-conventions/not-found)

## Founder decisions and exceptions

| Decision | Applied in this branch | Open item |
|---|---|---|
| D1 · Capacity and states | Existing multi-slot capacity and accepted-only release preserved. Filled shifts can retain sibling `Applied` records for possible reopening. | Reconcile the older one-hire and auto-rejection documents with the current runtime. |
| D2 · Job and profile photography | Actual shifts use date tiles. Applicant rows use initials. Existing optional profile photos are still available on the original profile surface. | Approve a job-photo data and use policy separately if desired. |
| D3 · Reference controls | Used the existing product routes and capabilities. The artwork’s hearts, Team link, speculative chips and filters were omitted. | None for this branch. |
| D4–D6 · Navigation and states | Desktop rail, mobile bottom navigation and exact workflow state labels. The application button stays in the document flow to avoid colliding with navigation or the keyboard. | Check real-phone ergonomics during visual review. |
| D7 · Ratings | Existing rating functionality retained. Applicant list gives prominence to actual completed shifts. The rating field remains a 1–5 selection with keyboard support. | Decide longer-term presentation of stars and reliability after reviewing trust implications. |
| D8 · Brand and hero assets | Retained the existing ticket/M silhouette, tinted coral, with a navy wordmark. Used an original neutral panel framing a labelled illustrative shift. No source image was extracted or republished. | Supply an approved clapperboard source and licensed production-set photography for exact asset fidelity. |
| D9–D12 · Contrast, copy and approval | Deep coral for white-text CTAs, accurate decision copy and explicit example labelling. The founder mandate authorises development-branch implementation. | Founder visual approval and release authorisation are separate. |

## Release risk and review limits

| Status | Item |
|---|---|
| Resolved in branch | Paused and non-actionable applications no longer inflate the new review counts. Shift links expose a concise accessible name while the full card remains the hit area. |
| Open asset gap | Exact clapperboard art and licensed hero photography are outstanding. The reference preview and actual fallback are intentionally distinct. |
| Known source mismatch | The documented single-hire and automatic sibling rejection rules are older than current multi-slot and reopening behaviour. Existing publish validation also requires end time after start time, so new overnight shifts that wrap across midnight remain unsupported. |
| Not exercised | Physical iOS/Android devices, a live screen-reader app, production email, live founder or hiring writes, simultaneous competing multi-slot acceptances, and a protected hosted preview. Keyboard/ARIA inspections and automated accessibility checks do not establish full WCAG conformance. |

Review on the branch. Production stays on its existing deployment.
