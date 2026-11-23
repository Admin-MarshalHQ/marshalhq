import type { Prisma } from "@prisma/client";

// All roster changes take the shift lock before touching applications.
export async function lockShift(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Shift" WHERE id = ${id} FOR UPDATE`;
}
