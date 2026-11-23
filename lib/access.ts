import { founderFreshness } from "@/lib/session-policy";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isFounderEmail, isFounderSession } from "@/lib/founder-identity";
import { isPilotParticipant } from "@/lib/pilot-participant";
import type { Role } from "@/lib/types";

export { isFounderEmail } from "@/lib/founder-identity";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requirePilotUser() {
  const user = await requireUser();
  if (!user.emailVerifiedAt) redirect("/verify-email");
  if (isFounderEmail(user.email) && !isFounderSession(user)) redirect("/login/founder");
  if (!isPilotParticipant(user.email)) redirect("/pilot-access");
  return user;
}

export async function requireRole(role: Role) {
  const user = await requirePilotUser();
  if (user.role !== role) redirect("/");
  return user;
}

export async function requireFounder(fresh = false) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login/founder");
  if (!isFounderEmail(user.email)) redirect("/");
  if (fresh && (!user.founderIssuedAt || Date.now() - user.founderIssuedAt >= founderFreshness)) redirect("/login/founder");
  if (!isFounderSession(user)) redirect("/login/founder");
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
