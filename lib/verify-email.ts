import crypto from "crypto";

const TOKEN_BYTES = 32;
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function generateRawEmailVerificationToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashEmailVerificationToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function emailVerificationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + EMAIL_VERIFY_TTL_MS);
}

export function buildEmailVerificationUrl(rawToken: string): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const root = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${root}/verify-email/${rawToken}`;
}
