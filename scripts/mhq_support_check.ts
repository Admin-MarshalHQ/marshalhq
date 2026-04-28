import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

(async () => {
  const requests = await p.supportRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { email: true } } },
  });
  console.log(
    JSON.stringify(
      requests.map((r) => ({
        id: r.id,
        from: r.email,
        linkedTo: r.user?.email ?? null,
        category: r.category,
        message: r.message.slice(0, 60),
        resolved: !!r.resolvedAt,
      })),
      null,
      2,
    ),
  );
  await p.$disconnect();
})();
