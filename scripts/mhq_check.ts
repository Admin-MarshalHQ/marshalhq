import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

(async () => {
  const alex = await p.user.findUnique({ where: { email: "alex@example.com" } });
  if (!alex) {
    console.log("no alex");
    return;
  }
  const tokens = await p.passwordResetToken.findMany({
    where: { userId: alex.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  console.log(
    JSON.stringify(
      tokens.map((t) => ({
        id: t.id,
        created: t.createdAt.toISOString(),
        expires: t.expiresAt.toISOString(),
        used: !!t.usedAt,
      })),
      null,
      2,
    ),
  );
  await p.$disconnect();
})();
