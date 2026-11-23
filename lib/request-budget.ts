import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const limits = {
  password: [40, 10, 1000],
  founderIssue: [10, 6, 100],
  founderVerify: [30, 15, 200],
  reset: [12, 3, 150],
  support: [15, 5, 100],
  waitlist: [30, 4, 200],
} as const;

// One shared hour-long budget per operation, plus independent source and
// address limits. Refuse the whole reservation if any bucket is exhausted.
class Exhausted extends Error {}

export async function allowRequest(operation: keyof typeof limits, email: string, requestHeaders?: Pick<Headers, "get">) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  const source = process.env.VERCEL === "1" ? (requestHeaders ?? headers()).get("x-vercel-forwarded-for") : null;
  const keys = ["global", "source:" + (source || "shared"), "email:" + email.trim().toLowerCase()];
  const [sourceLimit, accountLimit, globalLimit] = limits[operation];
  const maxima = [globalLimit, sourceLimit, accountLimit];
  try {
    await prisma.$transaction(async tx => {
      // Prisma stores DateTime as a UTC timestamp without a time zone.
      // Keep raw reservations on the same clock as the cleanup query.
      for (const [i, key] of keys.entries()) {
        const digest = createHmac("sha256", secret).update(operation + "/" + key).digest("hex");
        const changed = await tx.$executeRaw`
          INSERT INTO "RequestBudget" ("key", "hits", "expiresAt") VALUES (${digest}, 1, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '1 hour')
          ON CONFLICT ("key") DO UPDATE SET
            "hits" = CASE WHEN "RequestBudget"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN 1 ELSE "RequestBudget"."hits" + 1 END,
            "expiresAt" = CASE WHEN "RequestBudget"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '1 hour' ELSE "RequestBudget"."expiresAt" END
          WHERE "RequestBudget"."hits" < ${maxima[i]} OR "RequestBudget"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`;
        if (!changed) throw new Exhausted();
      }
    });
    if (Math.random() < 0.02) await prisma.requestBudget.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return true;
  } catch (error) {
    if (!(error instanceof Exhausted)) console.error("[budget] reservation failed");
    return false;
  }
}
