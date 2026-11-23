import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { isFounderEmail } from "@/lib/founder-identity";

export const founderLifetime = 60 * 60 * 1000;
export const founderFreshness = 10 * 60 * 1000;

export async function validateSession(token: JWT) {
  if (typeof token.uid !== "string") return null;
  const user = await prisma.user.findUnique({
    where: { id: token.uid },
    select: { email: true, role: true, emailVerifiedAt: true, sessionVersion: true, disabledAt: true },
  });
  if (!user || user.disabledAt || token.sessionVersion !== user.sessionVersion) return null;
  if (token.founderPasscode || isFounderEmail(user.email)) {
    if (!token.founderPasscode || !isFounderEmail(user.email) || typeof token.founderSessionId !== "string") return null;
    const record = await prisma.founderSession.findFirst({
      where: { id: token.founderSessionId, userId: token.uid, expiresAt: { gt: new Date() } },
      select: { issuedAt: true },
    });
    if (!record) return null;
    token.founderIssuedAt = record.issuedAt.getTime();
  }
  token.email = user.email;
  token.role = user.role;
  token.emailVerifiedAt = user.emailVerifiedAt?.toISOString() ?? null;
  return token;
}
