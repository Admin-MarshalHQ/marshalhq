# Schema drift check

Run this after any change to `prisma/schema.prisma` ships, and as part of every pre-invite smoke run. It takes one command and catches the failure mode that broke production on 2026-07-03.

## Why this exists

Deploys do **not** sync the database schema. This project uses `prisma db push` with no migrations directory, and nothing in the Vercel deploy runs it. A schema change can therefore ship in code while the production database still has the old shape — the code queries tables that don't exist and every affected page returns a 500.

That is exactly what happened on 2026-07-03: the `Review`, `AvailabilityBlock`, and `ShiftAlert` tables from a shipped schema change were never created in production. Marshal profile, history, availability, shift detail, and the apply flow all crashed until the tables were pushed.

## The check

```
npm run db:drift
```

This compares the deployed database (via `POSTGRES_URL` from `.env.local` / `.env`) against `prisma/schema.prisma` using `prisma migrate diff`. It is **read-only** — it never changes the database.

- **PASS (exit 0):** the database matches the schema. Nothing to do.
- **FAIL (exit 2):** the database and schema diverge. The exact SQL differences are printed. Code that queries the missing tables or columns will 500 in production.
- **ERROR (any other exit):** the comparison itself failed — usually the database is unreachable. The Supabase free tier pauses after ~7 days idle; restore it from the Supabase dashboard and retry. The session pooler (port 5432) also occasionally refuses the first connection — a retry usually succeeds.

## Fixing drift

1. Read the printed diff. Confirm it is additive (CREATE TABLE / CREATE INDEX / ADD CONSTRAINT). If it contains DROP or destructive ALTER statements, stop and work out why before touching production.
2. Apply it deliberately: `npm run db:push`.
3. Re-run `npm run db:drift` and confirm PASS.

## Rules

- The founder applies schema changes to the live database by hand, after reading the diff. Do **not** wire `db:push` into CI or the deploy — an automatic push against the pilot database is how data gets lost.
- Treat a FAIL on this check like a red contact-release gate in the [pre-invite smoke check](pre-invite-smoke-check.md): stop and repair before inviting anyone or announcing a release.

## When to run

- [ ] Immediately after any deploy whose diff touches `prisma/schema.prisma`.
- [ ] As part of the pre-invite smoke check setup (see [pre-invite-smoke-check.md](pre-invite-smoke-check.md), Setup).
- [ ] Any time production pages 500 with Prisma errors mentioning a missing table or column.
