// One-off cleanup: the dev seed historically pre-provisioned a
// `founder@marshalhq.com` account, but the actual MarshalHQ founder
// identity is `admin@marshalhq.com` (founder@ is not a real mailbox).
// After re-seeding under the new identity, the old row will sit orphaned
// because the seed's reset logic doesn't touch it. This script removes it.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const r = await prisma.user.deleteMany({
    where: { email: "founder@marshalhq.com" },
  });
  console.log(`[cleanup] deleted ${r.count} founder@marshalhq.com row(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
