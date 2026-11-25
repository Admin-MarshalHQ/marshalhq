"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireFounder } from "@/lib/access";
import { lockShift } from "@/lib/booking-lock";
import { prisma } from "@/lib/db";
import { invitedMarshalAddresses, invitedRole } from "@/lib/pilot-participant";
import { briefVersion } from "@/lib/vacancy-brief";

export async function recordVacancyRelease(
  shiftId: string,
  expectedBrief: string,
  previousId: string,
  form: FormData,
) {
  const path = `/founder/shifts/${shiftId}`;
  const founder = await requireFounder(true, path);
  const result = await prisma
    .$transaction(async (tx) => {
      await lockShift(tx, shiftId);
      const shift = await tx.shift.findUniqueOrThrow({
        where: { id: shiftId },
        include: { manager: { select: { role: true, email: true, disabledAt: true, emailVerifiedAt: true } } },
      });
      const current = await tx.vacancyRelease.findUnique({
        where: { activeSlot: "GB-pilot" },
      });
      if (current && current.shiftId !== shiftId) return "occupied";
      if (
        (current?.id ?? "") !== previousId ||
        briefVersion(shift) !== expectedBrief
      )
        return "changed";
      const hold = form.get("decision") === "hold";
      if (hold) {
        if (current)
          await tx.vacancyRelease.update({
            where: { id: current.id },
            data: {
              activeSlot: null,
              retiredAt: new Date(),
              retiredBy: founder.id,
            },
          });
        return "held";
      }
      const evidence = String(form.get("evidenceRef") ?? "").trim();
      const expiryText = String(form.get("expiresAt") ?? "");
      const expiry = new Date(expiryText);
      if (
        form.get("decision") !== "release" ||
        !/^[A-Za-z0-9_.-]{2,80}$/.test(evidence) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(expiryText) ||
        !Number.isFinite(+expiry) ||
        expiry <= new Date() ||
        !shift.engagementTerms ||
        shift.paused ||
        !["DRAFT", "OPEN", "FILLED"].includes(shift.status) ||
        shift.marshalsNeeded > 3 ||
        invitedRole(shift.manager.email) !== "MANAGER" ||
        shift.manager.disabledAt ||
        !shift.manager.emailVerifiedAt ||
        shift.manager.role !== "MANAGER"
      )
        return "invalid";
      const people = await tx.user.findMany({
        where: {
          email: { in: invitedMarshalAddresses() },
          role: "MARSHAL",
          disabledAt: null,
          emailVerifiedAt: { not: null },
          marshalProfile: { paused: false },
        },
        select: { id: true },
      });
      const eligible = new Set(people.map((p) => p.id));
      const ids = (field: string) =>
        Array.from(new Set(form.getAll(field).map(String)));
      const viewers = ids("viewers"),
        applicants = ids("applicants"),
        bookable = ids("bookable");
      if (
        !viewers.length ||
        viewers.some((id) => !eligible.has(id)) ||
        applicants.some((id) => !viewers.includes(id)) ||
        bookable.some((id) => !applicants.includes(id))
      )
        return "invalid";
      if (current)
        await tx.vacancyRelease.update({
          where: { id: current.id },
          data: {
            activeSlot: null,
            retiredAt: new Date(),
            retiredBy: founder.id,
          },
        });
      await tx.vacancyRelease.create({
        data: {
          shiftId,
          activeSlot: "GB-pilot",
          briefVersion: expectedBrief,
          evidenceRef: evidence,
          reviewerId: founder.id,
          expiresAt: expiry,
          viewers,
          applicants,
          bookable,
        },
      });
      return "saved";
    })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return "occupied";
      throw error;
    });
  revalidatePath(path);
  revalidatePath("/marshal/shifts");
  redirect(`${path}?vacancyRelease=${result}`);
}
