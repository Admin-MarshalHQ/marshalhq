// QA contamination scan.
//
// After the manual QA failure on 2026-04-27, we need to know whether the
// failed test runs left fake founder accounts or contact-leaked free-text in
// the database. The Zod refinements introduced by the External Audit
// Remediation only run on save, so any row written before the schema was
// tightened — or any row written through a path that bypassed the schema —
// could still contain leaked content.
//
// This script reports (and, with --fix, optionally cleans):
//
//   1. Public-signup rows whose email matches the reserved-signup blockade.
//      A fake `founder@…` user created during failed QA must not survive
//      into beta. We delete the account itself only with --fix; otherwise
//      we report the user id, role, and createdAt so the founder can review.
//
//   2. Marshal profile free-text fields that fail `detectContactLeak`. We
//      check fullName, baseLocation, experienceSummary, and training. With
//      --fix we blank the offending field (set to a placeholder) so the
//      profile can be re-saved through the form; without --fix we just list
//      the user id and which fields tripped.
//
//   3. Shift free-text fields that fail `detectContactLeak`. Same rule and
//      same outputs.
//
// The script never sends emails and never touches production traffic. It is
// safe to run repeatedly; without --fix it is read-only.
//
// Usage:
//   tsx scripts/qa_contamination_scan.ts          # report only
//   tsx scripts/qa_contamination_scan.ts --fix    # also clean offenders

import { PrismaClient } from "@prisma/client";
import { detectContactLeak } from "../lib/contact-detect";
import { isReservedSignupEmail } from "../lib/access";

const prisma = new PrismaClient({ log: ["error"] });
const FIX = process.argv.includes("--fix");

type ProfileLeak = {
  userId: string;
  email: string;
  field: "fullName" | "baseLocation" | "experienceSummary" | "training";
  value: string;
  kind: string;
};

type ShiftLeak = {
  shiftId: string;
  managerEmail: string;
  field:
    | "productionName"
    | "location"
    | "duties"
    | "parkingTravel"
    | "experienceNotes";
  value: string;
  kind: string;
};

async function main() {
  console.log(
    `[qa-scan] starting ${FIX ? "FIX" : "REPORT"} pass at ${new Date().toISOString()}`,
  );

  // ---- 1. Reserved-email user rows --------------------------------------
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  const reservedHits = allUsers.filter((u) => isReservedSignupEmail(u.email));
  console.log(`\n[qa-scan] users matching reserved-signup blockade: ${reservedHits.length}`);
  for (const u of reservedHits) {
    console.log(
      `  - ${u.email}  role=${u.role}  id=${u.id}  createdAt=${u.createdAt.toISOString()}`,
    );
  }
  // We only DELETE accounts that look like obvious test contamination: the
  // role must be UNSET or MARSHAL (a public-signup founder@… would not have
  // been pre-provisioned with manager privileges) AND the createdAt must be
  // recent (within the last 7 days). The legitimate pre-provisioned founder
  // account is created by the seed and is older than that.
  if (FIX) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = reservedHits.filter(
      (u) =>
        (u.role === "UNSET" || u.role === "MARSHAL") &&
        u.createdAt > sevenDaysAgo,
    );
    for (const u of candidates) {
      console.log(`  ⚠ deleting test contamination: ${u.email} (${u.id})`);
      await prisma.user.delete({ where: { id: u.id } });
    }
    if (candidates.length === 0) {
      console.log("  (no recent test contamination matched the delete rule)");
    }
  }

  // ---- 2. Marshal profile contact leaks ---------------------------------
  const profiles = await prisma.marshalProfile.findMany({
    select: {
      id: true,
      userId: true,
      fullName: true,
      baseLocation: true,
      experienceSummary: true,
      training: true,
      user: { select: { email: true } },
    },
  });
  const profileLeaks: ProfileLeak[] = [];
  for (const p of profiles) {
    const fields: Array<[ProfileLeak["field"], string | null]> = [
      ["fullName", p.fullName],
      ["baseLocation", p.baseLocation],
      ["experienceSummary", p.experienceSummary],
      ["training", p.training],
    ];
    for (const [field, value] of fields) {
      if (!value) continue;
      const result = detectContactLeak(value);
      if (!result.ok) {
        profileLeaks.push({
          userId: p.userId,
          email: p.user.email,
          field,
          value,
          kind: result.kind,
        });
      }
    }
  }
  console.log(`\n[qa-scan] marshal profile leaks: ${profileLeaks.length}`);
  for (const l of profileLeaks) {
    console.log(
      `  - ${l.email} ${l.field} (${l.kind}): ${truncate(l.value, 80)}`,
    );
  }
  if (FIX) {
    // For profiles we don't auto-edit free-text — that risks deleting real
    // experience copy. We simply pause the profile so it cannot be accepted
    // until the marshal re-saves through the form (which now validates).
    const ids = new Set(profileLeaks.map((l) => l.userId));
    if (ids.size > 0) {
      const r = await prisma.marshalProfile.updateMany({
        where: { userId: { in: Array.from(ids) } },
        data: { paused: true },
      });
      console.log(
        `  ⚠ paused ${r.count} marshal profile(s) until they re-save via the form`,
      );
    }
  }

  // ---- 3. Shift contact leaks -------------------------------------------
  const shifts = await prisma.shift.findMany({
    select: {
      id: true,
      productionName: true,
      location: true,
      duties: true,
      parkingTravel: true,
      experienceNotes: true,
      status: true,
      manager: { select: { email: true } },
    },
  });
  const shiftLeaks: ShiftLeak[] = [];
  for (const s of shifts) {
    const fields: Array<[ShiftLeak["field"], string | null]> = [
      ["productionName", s.productionName],
      ["location", s.location],
      ["duties", s.duties],
      ["parkingTravel", s.parkingTravel],
      ["experienceNotes", s.experienceNotes],
    ];
    for (const [field, value] of fields) {
      if (!value) continue;
      const result = detectContactLeak(value);
      if (!result.ok) {
        shiftLeaks.push({
          shiftId: s.id,
          managerEmail: s.manager.email,
          field,
          value,
          kind: result.kind,
        });
      }
    }
  }
  console.log(`\n[qa-scan] shift leaks: ${shiftLeaks.length}`);
  for (const l of shiftLeaks) {
    console.log(
      `  - shift=${l.shiftId} ${l.managerEmail} ${l.field} (${l.kind}): ${truncate(l.value, 80)}`,
    );
  }
  if (FIX) {
    // For shifts we pause rather than edit text — the manager re-saves through
    // the form which now validates. Pausing also hides the shift from marshals
    // immediately so a contaminated OPEN shift doesn't keep leaking while the
    // manager is offline.
    const ids = new Set(shiftLeaks.map((l) => l.shiftId));
    if (ids.size > 0) {
      const r = await prisma.shift.updateMany({
        where: { id: { in: Array.from(ids) } },
        data: { paused: true },
      });
      console.log(
        `  ⚠ paused ${r.count} shift(s) until the manager re-saves via the form`,
      );
    }
  }

  // ---- Summary ----------------------------------------------------------
  console.log("\n[qa-scan] summary");
  console.log(
    `  reserved-email users: ${reservedHits.length}, profile leaks: ${profileLeaks.length}, shift leaks: ${shiftLeaks.length}`,
  );
  console.log(
    FIX
      ? "  fix mode applied; re-run without --fix to confirm clean."
      : "  report only — re-run with --fix to clean (delete recent reserved-email users; pause leaked profiles/shifts).",
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

main()
  .catch((e) => {
    console.error("[qa-scan] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
