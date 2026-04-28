// Lightweight DB check — used during the QA Failure Remediation pass to
// confirm that submitting the public signup form with a reserved-signup
// email did not create a user row, profile row, or any side effect.
//
// Output is a single JSON line so it's easy to grep in test logs.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const email = process.argv[2] ?? "admin@marshalhq.com";
  const rows = await prisma.user.findMany({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      managerProfile: { select: { id: true } },
      marshalProfile: { select: { id: true } },
    },
  });
  console.log(JSON.stringify({ email, rows }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
