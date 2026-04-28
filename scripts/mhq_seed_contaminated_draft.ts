// Seed a contaminated draft directly via Prisma to simulate a legacy row
// that pre-dated the contact-detection schema refinement. Used by the QA
// Failure Remediation pass to verify the new publish-time backstop catches
// such drafts.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const sam = await prisma.user.findUnique({
    where: { email: "manager@example.com" },
    select: { id: true },
  });
  if (!sam) {
    console.error("manager@example.com not found; run db:seed first");
    process.exit(1);
  }
  // Direct write bypasses Zod, mirroring a legacy row written before the
  // schema refinement was added.
  const created = await prisma.shift.create({
    data: {
      managerId: sam.id,
      productionName: "Contamination test draft",
      location: "Soho W1",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: "07:00",
      endTime: "19:00",
      rate: 15,
      rateUnit: "HOUR",
      duties:
        "Hold traffic at base. Email me at john@example.com if anything urgent.",
      status: "DRAFT",
    },
    select: { id: true },
  });
  console.log(`[seed] created contaminated DRAFT shift id=${created.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
