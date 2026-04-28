import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.shift.findMany({
  where: { productionName: { contains: "BBC test" } },
  select: { id: true, productionName: true, duties: true, status: true, createdAt: true },
}).then(rows => {
  console.log(JSON.stringify(rows, null, 2));
  return p.$disconnect();
}).catch(e => { console.error(e); process.exit(1); });
