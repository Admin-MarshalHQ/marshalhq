"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { FOUNDER_PASSCODE_PROVIDER } from "@/lib/auth-config";
import { issueFounderPasscode } from "@/lib/founder-passcode";
import { safeNextPath } from "@/lib/redirect";
import { ForgotPasswordSchema } from "@/lib/zod";

type PasscodeRequestState = { email?: string; error?: string } | null;

export async function requestFounderPasscodeAction(
  _previous: PasscodeRequestState,
  formData: FormData,
): Promise<PasscodeRequestState> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const { email } = parsed.data;
  try {
    await issueFounderPasscode(email);
  } catch (err) {
    console.error("[founder-login] could not issue passcode", {
      errName: err instanceof Error ? err.name : "unknown",
    });
  }
  // Give the same response for registered, unregistered, and throttled addresses.
  return { email };
}

export async function verifyFounderPasscodeAction(
  _previous: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  try {
    await signIn(FOUNDER_PASSCODE_PROVIDER, {
      email: formData.get("email"),
      code: formData.get("code"),
      redirect: false,
    });
  } catch {
    return { error: "That code is invalid or has expired. Try again or request a new code." };
  }

  const next = safeNextPath(formData.get("next"), "/founder");
  const pathname = new URL(next, "https://setru.invalid").pathname;
  redirect(pathname === "/founder" || pathname.startsWith("/founder/") ? next : "/founder");
}
