import crypto from "crypto";

// Password reset tokens. The raw token is what we put in the email link; what
// lives in the database is its SHA-256 hash. A DB leak therefore can't be used
// to hijack an unused reset, and stolen email contents still have to win the
// race against expiry (1h) and single-use.

const TOKEN_BYTES = 32;
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generateRawResetToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashResetToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function resetExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESET_TTL_MS);
}

export function buildResetUrl(rawToken: string): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  // Avoid double slashes if APP_BASE_URL has a trailing one.
  const root = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${root}/reset/${rawToken}`;
}
