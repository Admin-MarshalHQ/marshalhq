#!/usr/bin/env node
// Schema-drift check: compares the deployed database schema against
// prisma/schema.prisma and exits non-zero when they diverge.
//
// Why this exists: deploys do NOT sync the schema. This project uses
// `prisma db push` with no migrations directory, and nothing on Vercel runs
// it — so a schema change can ship in code while the production database
// still has the old shape. That happened on 2026-07-03: the Review,
// AvailabilityBlock, and ShiftAlert tables were never created in production
// and every page that queried them returned a 500.
//
// This script only READS the database (prisma migrate diff is a comparison,
// not a migration). It never applies changes — applying is a deliberate,
// founder-run `npm run db:push` after reviewing the diff.
//
// npm scripts don't load .env files, so resolve the connection URL the same
// way Next does: real environment first, then .env.local, then .env.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

const dotenv = {
  ...parseEnvFile(resolve(root, ".env")),
  ...parseEnvFile(resolve(root, ".env.local")),
};

// POSTGRES_URL is the schema's directUrl (session pooler) — preferred for
// schema operations. Fall back to DATABASE_URL if it's absent.
const url =
  process.env.POSTGRES_URL ??
  dotenv.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  dotenv.DATABASE_URL;

if (!url) {
  console.error(
    "db:drift: no POSTGRES_URL or DATABASE_URL found in the environment, .env.local, or .env.",
  );
  process.exit(1);
}

console.log("db:drift: comparing the deployed schema against prisma/schema.prisma …");

const result = spawnSync(
  "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-url",
    url,
    "--to-schema-datamodel",
    resolve(root, "prisma", "schema.prisma"),
    "--exit-code",
  ],
  { cwd: root, stdio: "inherit" },
);

// prisma migrate diff --exit-code: 0 = no difference, 2 = difference found,
// anything else = the comparison itself failed (unreachable DB, bad URL).
if (result.status === 0) {
  console.log("db:drift: PASS — database matches prisma/schema.prisma.");
  process.exit(0);
}
if (result.status === 2) {
  console.error(
    [
      "",
      "db:drift: FAIL — the deployed database does not match prisma/schema.prisma.",
      "The differences are listed above. Code that queries missing tables or",
      "columns will 500 in production.",
      "",
      "To fix: review the diff, then apply it deliberately with `npm run db:push`.",
      "Do not wire this into CI as an automatic push — schema changes to the",
      "live pilot database are a founder decision.",
    ].join("\n"),
  );
  process.exit(2);
}
console.error(
  "db:drift: ERROR — could not compare schemas (is the database reachable?). " +
    "The Supabase free tier pauses after ~7 days idle; restore it from the " +
    "Supabase dashboard and retry. The 5432 pooler also occasionally refuses " +
    "the first connection — a retry usually succeeds.",
);
process.exit(result.status ?? 1);
