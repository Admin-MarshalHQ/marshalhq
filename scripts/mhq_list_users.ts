// Quick list of all user rows for the QA Failure Remediation audit.
// Output is JSON so it's easy to read into other tools.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      managerProfile: { select: { id: true, companyName: true } },
      marshalProfile: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(JSON.stringify({ total: users.length, users }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
