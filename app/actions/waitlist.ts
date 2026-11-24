"use server";

import { intakeHeld } from "@/lib/intake";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { flushNotificationEmails } from "@/lib/notify";
import { WaitlistEntrySchema } from "@/lib/zod";
import { allowRequest } from "@/lib/request-budget";

export type ActionState = { error?: string } | null;

// Public waitlist intake. Mirrors the support flow ([app/actions/recovery.ts])
// but explicitly never creates a user, never starts a session, and never
// touches auth. The founder reviews entries manually.
export async function submitWaitlistEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (intakeHeld()) return { error: "New waitlist entries are paused." };
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
    consentToContact: false,
    managerRole: company || null,
    expectedNeed: isManager && v.expectedNeed ? v.expectedNeed : null,
    marshalExperience:
      isMarshal && v.marshalExperience ? v.marshalExperience : null,
    availability: isMarshal && v.availability ? v.availability : null,
    source: "homepage:confirmation-and-one-role-update:v1",
  };

  let createdId: string;
  let deliveryId: string | undefined;
  if (!(await allowRequest("waitlist", v.email))) return { error: "Too many requests. Please try again later." };
  try {
    const created = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"waitlist:" + v.email}, 0))`;
      const exists = await tx.waitlistEntry.findFirst({ where: { email: v.email, role: v.role }, select: { id: true, delivery: { select: { id: true } } } });
      if (exists) {
        // Historical confirmations have no trustworthy dispatch status.
        // Only retry tracked deliveries, never replay the historical list.
        deliveryId = exists.delivery?.id;
        return null;
      }
      const entry = await tx.waitlistEntry.create({ data });
      const delivery = await tx.mailDelivery.create({ data: { waitlistId: entry.id } });
      deliveryId = delivery.id;
      return entry;
    });
    createdId = created?.id ?? "";
  } catch (err) {
    console.error("[waitlist] could not record entry", {
      errName: err instanceof Error ? err.name : "unknown",
    });
    return { error: "Something went wrong saving your interest. Try again." };
  }

  if (deliveryId) await flushNotificationEmails([deliveryId], true);
  if (!createdId) redirect("/early-access/thanks");
  const notifyTo = process.env.SUPPORT_NOTIFY_EMAIL?.trim();
  const founderNotify = notifyTo
    ? sendEmail({
        to: notifyTo,
        subject: "New Setru waitlist entry",
        body: "A new entry is ready to review in the founder waitlist dashboard.",
      }).then((result) => {
        if (!result.ok) {
          console.error("[waitlist] founder notification failed", {
            entryId: createdId,
            reason: result.reason,
          });
        }
      })
    : Promise.resolve();

  await Promise.allSettled([founderNotify]);

  redirect("/early-access/thanks");
}
