import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}

// Founder identity is derived from env, not a role column, so the trusted loop
// stays MANAGER/MARSHAL and the founder panel is gated by a single source of
// truth. Comma-separated list; matched case-insensitively.
function founderEmails(): string[] {
  return (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return founderEmails().includes(email.trim().toLowerCase());
}

export async function requireFounder() {
  const user = await requireUser();
  if (!isFounderEmail(user.email)) redirect("/");
  return user;
}

// Defence-in-depth: a small hardcoded list of reserved addresses that public
// signup must always refuse, regardless of FOUNDER_EMAILS. The deployed env
// is the source of truth for actual founder access (middleware, requireFounder)
// — this list exists only so a misconfigured or empty FOUNDER_EMAILS cannot
// turn the public signup form into a founder-account creation path.
//
// Only addresses we never want anyone to claim through public signup belong
// here. Adding a real founder address here does NOT grant founder access; the
// env list still does. The two checks are independent on purpose so neither
// can silently fail open.
const RESERVED_SIGNUP_EMAILS = [
  "founder@marshalhq.com",
  "admin@marshalhq.com",
  "support@marshalhq.com",
  "noreply@marshalhq.com",
];

export function isReservedSignupEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const normalised = email.trim().toLowerCase();
  if (RESERVED_SIGNUP_EMAILS.includes(normalised)) return true;
  return isFounderEmail(email);
}
