import { prisma } from "@/lib/db";
import { retryDueDeliveries } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  await retryDueDeliveries();
  await prisma.pilotJoinCode.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  return new Response(null, { status: 204 });
}
