-- Monthly triage. Counts only. Age alone never establishes erasure eligibility.
-- Check statutory last-service dates, open cases, claims and legal holds in
-- the restricted case record before setting a disposition or removing data.
SELECT
  (SELECT count(*) FROM "WaitlistEntry" WHERE "withdrawnAt" <= now() - interval '30 days') AS withdrawn_entries_for_minimisation,
  (SELECT count(*) FROM "WaitlistEntry" WHERE "withdrawnAt" IS NULL AND "createdAt" <= now() - interval '6 months') AS waitlist_continuing_purpose_review,
  (SELECT count(*) FROM "User" WHERE "emailVerifiedAt" IS NULL AND "createdAt" <= now() - interval '30 days') AS unverified_accounts_for_review,
  (SELECT count(*) FROM "Application" WHERE status IN ('REJECTED','WITHDRAWN') AND "decidedAt" <= now() - interval '90 days' AND "coverNote" IS NOT NULL) AS unsuccessful_notes_for_review,
  (SELECT count(*) FROM "SupportRequest" WHERE "resolvedAt" <= now() - interval '12 months') AS closed_cases_for_review;
