"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { WaitlistEntrySchema } from "@/lib/zod";
import {
  WAITLIST_AVAILABILITY_LABEL,
  WAITLIST_EXPECTED_NEED_LABEL,
  WAITLIST_MARSHAL_EXPERIENCE_LABEL,
  WAITLIST_ROLE_LABEL,
  type WaitlistAvailability,
  type WaitlistExpectedNeed,
  type WaitlistMarshalExperience,
  type WaitlistRole,
} from "@/lib/types";

export type ActionState = { error?: string } | null;

// Public waitlist intake. Mirrors the support flow ([app/actions/recovery.ts])
// but explicitly never creates a user, never starts a session, and never
// touches auth. The founder reviews entries manually.
export async function submitWaitlistEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const get = (k: string) => {
    const v = formData.get(k);
    return v == null ? "" : String(v);
  };

  const parsed = WaitlistEntrySchema.safeParse({
    name: get("name"),
    email: get("email"),
    role: get("role"),
    location: get("location"),
    note: get("note"),
    consentToContact: get("consentToContact"),
    managerRole: get("managerRole"),
    expectedNeed: get("expectedNeed"),
    marshalExperience: get("marshalExperience"),
    availability: get("availability"),
  });

  if (!parsed.success) {
    console.error("[waitlist] validation failed", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const v = parsed.data;
  const isManager = v.role === "MANAGER";

  // Belt-and-braces: drop any role-irrelevant field the schema let through as
  // an empty string. The DB stores null for fields that don't apply.
  const data = {
    name: v.name,
    email: v.email,
    role: v.role,
    location: v.location,
    note: v.note,
    consentToContact: true,
    managerRole: isManager && v.managerRole ? v.managerRole : null,
    expectedNeed: isManager && v.expectedNeed ? v.expectedNeed : null,
    marshalExperience:
      !isManager && v.marshalExperience ? v.marshalExperience : null,
    availability: !isManager && v.availability ? v.availability : null,
    source: "landing",
  };

  let createdId: string;
  let createdAt: Date;
  try {
    const created = await prisma.waitlistEntry.create({
      data,
      select: { id: true, createdAt: true },
    });
    createdId = created.id;
    createdAt = created.createdAt;
  } catch (err) {
    console.error("[waitlist] could not record entry", {
      errName: err instanceof Error ? err.name : "unknown",
    });
    return { error: "Something went wrong saving your interest. Try again." };
  }

  // Optional founder notification — best-effort, never blocks the redirect.
  // Same env var as the support flow so the founder gets one inbox.
  const notifyTo = (process.env.SUPPORT_NOTIFY_EMAIL ?? "").trim();
  if (notifyTo) {
    const roleLabel = WAITLIST_ROLE_LABEL[v.role as WaitlistRole];
    const detailLines: string[] = [];
    if (isManager) {
      if (v.managerRole) {
        detailLines.push(`Production-side role: ${v.managerRole}`);
      }
      if (v.expectedNeed) {
        detailLines.push(
          `Expected need: ${
            WAITLIST_EXPECTED_NEED_LABEL[v.expectedNeed as WaitlistExpectedNeed]
          }`,
        );
      }
    } else {
      if (v.marshalExperience) {
        detailLines.push(
          `Experience: ${
            WAITLIST_MARSHAL_EXPERIENCE_LABEL[
              v.marshalExperience as WaitlistMarshalExperience
            ]
          }`,
        );
      }
      if (v.availability) {
        detailLines.push(
          `Availability: ${
            WAITLIST_AVAILABILITY_LABEL[v.availability as WaitlistAvailability]
          }`,
        );
      }
    }

    const body =
      `A new early access waitlist entry has been submitted.\n\n` +
      `Name: ${v.name}\n` +
      `Email: ${v.email}\n` +
      `Role: ${roleLabel}\n` +
      `Location: ${v.location}\n` +
      `Created: ${createdAt.toISOString()}\n` +
      (detailLines.length ? `${detailLines.join("\n")}\n` : "") +
      `\nNote:\n${v.note}\n\n` +
      `Review: ${process.env.APP_BASE_URL ?? "http://localhost:3000"}/founder/waitlist`;

    const result = await sendEmail({
      to: notifyTo,
      subject: `[Waitlist] ${roleLabel} — ${v.name}`,
      body,
    });
    if (!result.ok) {
      console.error("[waitlist] founder notification failed", {
        entryId: createdId,
        reason: result.reason,
      });
    }
  }

  redirect("/early-access/thanks");
}
