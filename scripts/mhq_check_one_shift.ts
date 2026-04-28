import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const id = process.argv[2];
p.shift.findUnique({
  where: { id },
  select: { id: true, productionName: true, managerId: true, status: true, manager: { select: { email: true } } },
}).then(r => { console.log(JSON.stringify(r, null, 2)); return p.$disconnect(); }).catch(e => { console.error(e); process.exit(1); });
