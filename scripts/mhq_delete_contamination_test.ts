// Cleanup of the contamination test draft created by the QA Failure
// Remediation pass. Re-running db:seed would not delete it (the draft was
// created outside the seeded shift set).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const r = await prisma.shift.deleteMany({
    where: { productionName: "Contamination test draft" },
  });
  console.log(`[cleanup] deleted ${r.count} contamination test draft(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
