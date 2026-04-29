"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SignupSchema } from "@/lib/zod";
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isReservedSignupEmail } from "@/lib/access";
import { safeNextPath } from "@/lib/redirect";

export type ActionState = { error?: string } | null;

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    companyName: formData.get("companyName") ?? "",
    displayName: formData.get("displayName") ?? "",
    pilotCode: formData.get("pilotCode") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, password, phone, role, companyName, displayName, pilotCode } =
    parsed.data;
  // MarshalHQ runs as a controlled private pilot. Account creation requires a
  // valid founder-issued code matching the role. We compare against env vars
  // (PILOT_CODE_MANAGER / PILOT_CODE_MARSHAL) rather than a DB table so there
  // is no redemption history, no founder dashboard surface area, and rotation
  // is a single env-var change. If the env var is unset, the comparison fails
  // closed so a misconfigured deploy can't turn signup into an open path.
  // The check runs before isReservedSignupEmail so an attacker without a code
  // never learns whether a given email is reserved.
  const expectedPilotCode =
    role === "MANAGER"
      ? process.env.PILOT_CODE_MANAGER
      : process.env.PILOT_CODE_MARSHAL;
  if (!expectedPilotCode || pilotCode !== expectedPilotCode) {
    return {
      error:
        "Account creation requires a valid pilot code. If you don’t have one, you can join the waitlist.",
    };
  }
  // Founder access is pre-provisioned server-side only — never via the public
  // signup form. Reject any attempt to claim a FOUNDER_EMAILS address (or one
  // of the hardcoded reserved addresses) through this path. The hardcoded
  // fallback means the signup blockade still holds even if FOUNDER_EMAILS is
  // empty or misconfigured in a deployed environment, so an env mistake can
  // never turn signup into a founder-account creation path. A generic message
  // is returned so the form doesn't double as an enumeration oracle.
  if (isReservedSignupEmail(email)) {
    return {
      error:
        "This email can\u2019t be used to create an account. If you think this is a mistake, contact support.",
    };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      phone,
      role,
      managerProfile:
        role === "MANAGER"
          ? {
              create: {
                companyName: companyName!,
                displayName: displayName!,
              },
            }
          : undefined,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch {
    // Fall through: user can log in manually.
  }
  if (role === "MANAGER") redirect("/manager");
  redirect("/marshal/profile/edit");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawNext = formData.get("next");
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch {
    return { error: "Invalid email or password." };
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  if (!user) return { error: "Invalid email or password." };
  // `next` can be user-controlled (the login page forwards it from the URL).
  // safeNextPath rejects protocol-relative and external redirects so we can't
  // be used to launder a link to an attacker-controlled host.
  const roleFallback =
    user.role === "MANAGER" ? "/manager" : user.role === "MARSHAL" ? "/marshal" : "/";
  redirect(safeNextPath(rawNext, roleFallback));
}

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
