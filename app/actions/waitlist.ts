"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { waitlistConfirmationEmail } from "@/lib/waitlist-confirmation";
import { WaitlistEntrySchema } from "@/lib/zod";
import { WAITLIST_ROLE_LABEL } from "@/lib/types";

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
    roleOther: get("roleOther"),
    company: get("company"),
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
  const company = (v.company || v.managerRole || "").trim();
  const location = (v.location || "").trim();
  const roleOther = (v.roleOther || "").trim();
  const note = (v.note || "").trim();
  const noteForStorage = roleOther
    ? `Connection: ${roleOther}${note ? `\n\n${note}` : ""}`
    : note;
  const isManager = v.role === "MANAGER";
  const isMarshal = v.role === "MARSHAL";

  // The existing table has a legacy managerRole free-text column. For the
  // public waitlist it stores the optional company/production field so we can
  // avoid a database migration for a lightweight demand-capture page.
  const data = {
    name: v.name,
    email: v.email,
    role: v.role,
    location,
    note: noteForStorage,
    consentToContact: true,
    managerRole: company || null,
    expectedNeed: isManager && v.expectedNeed ? v.expectedNeed : null,
    marshalExperience:
      isMarshal && v.marshalExperience ? v.marshalExperience : null,
    availability: isMarshal && v.availability ? v.availability : null,
    source: "homepage",
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

  // Prepare the founder email summary from the stored request.
  const notifyTo = (process.env.SUPPORT_NOTIFY_EMAIL ?? "").trim();
  const roleLabel = WAITLIST_ROLE_LABEL[v.role];
  const detailLines: string[] = [];
  if (company) {
    detailLines.push(`Company or production: ${company}`);
  }
  if (location) {
    detailLines.push(`Region or base: ${location}`);
  }
  if (roleOther) {
    detailLines.push(`Connection to location work: ${roleOther}`);
  }

  // Email side-effects are best-effort. The database row is the source of
  // truth, and a mail outage must not drop a valid waitlist request.
  const confirmation = sendEmail({
    to: v.email,
    ...waitlistConfirmationEmail(v.role),
  }).then((result) => {
    if (!result.ok) {
      console.error("[waitlist] confirmation email failed", {
        entryId: createdId,
        reason: result.reason,
      });
    }
  });

  const founderNotify = notifyTo
    ? sendEmail({
        to: notifyTo,
        subject: `[Waitlist] ${roleLabel} - ${v.name}`,
        body:
          `A new early access waitlist entry has been submitted.\n\n` +
          `Name: ${v.name}\n` +
          `Email: ${v.email}\n` +
          `Role: ${roleLabel}\n` +
          `Created: ${createdAt.toISOString()}\n` +
          (detailLines.length ? `${detailLines.join("\n")}\n` : "") +
          `\nNote:\n${noteForStorage || "No note supplied."}\n\n` +
          `Review: ${process.env.APP_BASE_URL ?? "http://localhost:3000"}/founder/waitlist`,
      }).then((result) => {
        if (!result.ok) {
          console.error("[waitlist] founder notification failed", {
            entryId: createdId,
            reason: result.reason,
          });
        }
      })
    : Promise.resolve();

  await Promise.allSettled([confirmation, founderNotify]);

  redirect("/early-access/thanks");
}
