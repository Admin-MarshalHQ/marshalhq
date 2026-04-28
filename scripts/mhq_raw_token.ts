import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// Helper: we only have the stored hash, but we can peek at the most recent
// unused token for alex. For real verification we need a way to submit the
// reset form with a valid raw token. So instead: mint a NEW token via the
// server helpers so we know the raw string.
import { generateRawResetToken, hashResetToken, resetExpiry } from "../lib/reset";

const p = new PrismaClient();
(async () => {
  const alex = await p.user.findUnique({ where: { email: "alex@example.com" } });
  if (!alex) { console.log("no alex"); return; }
  const raw = generateRawResetToken();
  await p.passwordResetToken.create({
    data: { userId: alex.id, tokenHash: hashResetToken(raw), expiresAt: resetExpiry() },
  });
  console.log(raw);
  await p.$disconnect();
})();
