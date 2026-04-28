"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SupportRequestSchema,
} from "@/lib/zod";
import {
  buildResetUrl,
  generateRawResetToken,
  hashResetToken,
  resetExpiry,
} from "@/lib/reset";
import { sendEmail } from "@/lib/mail";
import { auth } from "@/lib/auth";
import { SUPPORT_CATEGORY_LABEL, type SupportCategory } from "@/lib/types";

export type ActionState = { error?: string } | null;

// ---------- Password reset request -----------------------------------------
// Always responds with the same neutral confirmation screen, regardless of
// whether the email is in the database — we don't want this flow to double as
// an email-enumeration oracle. If there's a matching user, we issue a fresh
// token and email the link; otherwise we silently do nothing.
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    // Even for invalid input we redirect to the confirmation screen — invalid
    // emails don't leak account state either.
    redirect("/forgot/sent");
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const raw = generateRawResetToken();
    const tokenHash = hashResetToken(raw);
    let createdTokenId: string | null = null;
    try {
      const created = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: resetExpiry(),
        },
        select: { id: true },
      });
      createdTokenId = created.id;
      const url = buildResetUrl(raw);
      const result = await sendEmail({
        to: user.email,
        subject: "Reset your MarshalHQ password",
        body:
          `Someone asked to reset the password for the MarshalHQ account linked to this email.\n\n` +
          `If it was you, use the link below to set a new password. The link expires in 1 hour and can only be used once.\n\n` +
          `${url}\n\n` +
          `If it wasn't you, you can ignore this email. Your password will stay the same.`,
      });
      if (!result.ok) {
        // Email send failed — the token exists in the database but was never
        // delivered. Invalidate it immediately so it can't sit as a usable,
        // unmailed reset if (e.g.) the DB gets read by someone with access.
        // Error output does not include the raw token or the URL; only the
        // reason code and userId.
        console.error("[recovery] password reset email failed to send", {
          userId: user.id,
          reason: result.reason,
        });
        await prisma.passwordResetToken.update({
          where: { id: createdTokenId },
          data: { usedAt: new Date() },
        });
      }
    } catch (err) {
      // Never log the raw token, the hash, or err.message (which can echo
      // arguments on some Prisma errors). Only the error name is safe.
      console.error("[recovery] could not issue reset token", {
        userId: user.id,
        errName: err instanceof Error ? err.name : "unknown",
      });
      if (createdTokenId) {
        await prisma.passwordResetToken
          .update({
            where: { id: createdTokenId },
            data: { usedAt: new Date() },
          })
          .catch(() => undefined);
      }
    }
  }
  redirect("/forgot/sent");
}

// ---------- Password reset completion --------------------------------------
// Verifies a token, enforces single-use + expiry, then updates the password
// and returns the user to the login page with a success flash. Expired/invalid
// tokens bounce back to a calm failure state.
export async function completePasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, password } = parsed.data;
  const tokenHash = hashResetToken(token);
  // Pre-flight lookup tells us the token's userId so we can hash and write
  // the new password. The actual consumption happens inside the transaction
  // via an updateMany with a usedAt-null guard — that's what keeps it
  // atomic and race-safe. Two concurrent submissions of the same token
  // race to the same row; the first wins, the second finds count=0 and
  // bounces to the expired screen.
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    redirect("/reset/expired");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let consumed = false;
  try {
    await prisma.$transaction(async (tx) => {
      // Atomic consumption: the WHERE clause includes usedAt=null and a
      // fresh expiry check. If another request already used the token,
      // count is 0, we throw, and the outer handler redirects to /expired.
      // The password update and token invalidation happen in one safe
      // operation — either everything commits or nothing does.
      const consumption = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (consumption.count !== 1) {
        throw new Error("RESET_TOKEN_STALE");
      }
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      // Invalidate any other outstanding tokens for this user so an old link
      // from the same request chain can't be used after the password is reset.
      await tx.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
        data: { usedAt: new Date() },
      });
      consumed = true;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "RESET_TOKEN_STALE") {
      redirect("/reset/expired");
    }
    // Any other failure: don't reveal details in an error string.
    console.error("[recovery] password reset failed", {
      errName: err instanceof Error ? err.name : "unknown",
    });
    redirect("/reset/expired");
  }
  if (!consumed) redirect("/reset/expired");
  redirect("/login?reset=1");
}

// ---------- Support / privacy request --------------------------------------
// Accepts submissions from logged-in or logged-out visitors. We never perform
// destructive action here — deletion requests flow into the same table and
// the founder reviews them manually.
export async function submitSupportRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  const loggedInEmail = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;

  // formData.get() returns null for missing fields; Zod's string schemas reject
  // null. Coerce to "" so the optional fields (name, email for logged-in users)
  // don't break validation when their inputs aren't rendered.
  const rawEmail =
    loggedInEmail ?? (formData.get("email") ? String(formData.get("email")) : "");
  const rawName = formData.get("name");
  const parsed = SupportRequestSchema.safeParse({
    email: rawEmail,
    name: rawName ? String(rawName) : "",
    category: formData.get("category"),
    message: formData.get("message") ? String(formData.get("message")) : "",
  });
  if (!parsed.success) {
    console.error("[support] validation failed", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, name, category, message } = parsed.data;

  let createdId: string;
  try {
    const created = await prisma.supportRequest.create({
      data: {
        userId,
        email,
        name: name || null,
        category,
        message,
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (err) {
    console.error("[support] could not record request", err);
    return { error: "Something went wrong saving your request. Try again." };
  }

  // Email side-effects are best-effort. If they fail we still want the
  // database record so the founder can follow up.
  const catLabel =
    SUPPORT_CATEGORY_LABEL[category as SupportCategory] ?? category;
  const confirmation = sendEmail({
    to: email,
    subject: "We received your MarshalHQ request",
    body:
      `Thanks for getting in touch.\n\n` +
      `Category: ${catLabel}\n\n` +
      `A human at MarshalHQ will review your request and reply. Privacy and account deletion requests are handled manually and may take a few working days.\n\n` +
      `For your records, this is the message we received:\n\n${message}`,
  }).then((r) => {
    if (!r.ok) {
      console.error("[support] confirmation email failed", {
        requestId: createdId,
        reason: r.reason,
      });
    }
  });

  const notifyTo = (process.env.SUPPORT_NOTIFY_EMAIL ?? "").trim();
  const founderNotify = notifyTo
    ? sendEmail({
        to: notifyTo,
        subject: `[Support] ${catLabel}`,
        body:
          `A new support request has been submitted.\n\n` +
          `From: ${email}${name ? ` (${name})` : ""}\n` +
          `Logged-in user: ${userId ? "yes" : "no"}\n` +
          `Category: ${catLabel}\n\n` +
          `Message:\n${message}\n\n` +
          `Review: ${process.env.APP_BASE_URL ?? "http://localhost:3000"}/founder/support`,
      }).then((r) => {
        if (!r.ok) {
          console.error("[support] founder notification failed", {
            requestId: createdId,
            reason: r.reason,
          });
        }
      })
    : Promise.resolve();

  await Promise.allSettled([confirmation, founderNotify]);
  redirect("/support/thanks");
}
