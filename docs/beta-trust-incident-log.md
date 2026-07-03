# Beta trust and incident log

Manual log for the controlled private beta. Founder fills this in by hand. It is not a product feature, not analytics, not a dispute centre. It exists so the founder can spot patterns early and decide whether to keep inviting.

Keep entries short. One row per incident. Resolve quickly or escalate to "pause invites".

## How to use

1. When something happens that did not match the expected loop, add a row.
2. Pick exactly one classification (beta blocker / hardening item / later improvement / noise).
3. If "beta blocker", stop inviting new users until the failed gate is repaired. Do not start Sprint 4. Do not widen the product. Repair only the gate that failed.
4. Cross-reference the incident with the relevant first-shift checklist entry in [docs/founder-first-shift-checklist.md](founder-first-shift-checklist.md).

## Incident types tracked

- Dropout after acceptance (marshal pulled out, shift had to be reopened).
- Manager cancellation after acceptance (shift cancelled after a booking).
- Contact bypass attempt (someone tried to share contact through profile, shift, cover note, or support form).
- Confusing status (either side could not tell what state the shift or application was in).
- Unclear shift post (post failed to give the marshal enough to act on).
- Weak marshal profile (profile failed to give the manager enough signal).
- Support request raised (anything that came in through `/support`).
- Email delivery failure (password reset / support confirmation / founder notify did not arrive, landed in spam, or showed broken links).
- Founder access behaved unexpectedly (anything in `/founder/*` did not match the expected view).
- Account recovery failure (user could not get back into their account).

## Classification rules

- **beta blocker** — the failure undermines the trusted loop. Pause invites until repaired. Examples: contact leaks before acceptance; founder access misbehaves; users cannot recover accounts; email failure blocks operational trust; cancellation or dropout handling fails.
- **hardening item** — real, but the trusted loop still holds. Add to [docs/hardening-backlog.md](hardening-backlog.md). Do not begin work unless it starts blocking controlled beta use.
- **later improvement** — an idea, a polish item, or a workflow that could be cleaner. Park it. Do not turn it into a feature mid-beta.
- **noise** — one-off user error, environment glitch, expected behaviour misread as a bug. No action needed beyond the log row.

## Log

| # | Date | Shift / user | What happened (one line) | Type | Founder action | Outcome | Classification |
|---|------|--------------|--------------------------|------|----------------|---------|----------------|
|   |      |              |                          |      |                |         |                |

(duplicate the row for each new incident; oldest at top)

---

## Pause-invites trigger

Stop inviting new users immediately if any of these occur during the beta:

- contact leaks before acceptance
- founder access behaves unexpectedly
- users cannot recover accounts
- shift status becomes confusing in real use
- support requests are missed
- cancellation or dropout handling fails
- email failure blocks operational trust
- users bypass the structured flow because the product is unclear or slower than WhatsApp

If invites are paused: record the trigger here, repair only the failing gate, then resume invites in the same controlled batch size. Do not expand product surface as the response.

## Pause history

| Date paused | Trigger (incident #) | Date resumed | What was repaired |
|-------------|----------------------|--------------|-------------------|
|             |                      |              |                   |
