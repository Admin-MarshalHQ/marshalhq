import { createHash } from "node:crypto";
import type { Shift } from "@prisma/client";

export const applicationNoticeVersion = "GB-pilot-2026-11-24.1";

// Explicit fields keep operator notes, phone numbers and mutable booking state out
// of the participant's brief. Changes to any material term change the version.
export function vacancyBrief(s: Shift) {
  return {
    shiftId: s.id,
    managerId: s.managerId,
    productionName: s.productionName,
    location: s.location,
    firstCall: s.startDate.toISOString().slice(0, 10),
    lastCall: s.endDate.toISOString().slice(0, 10),
    timeZone: "Europe/London",
    dailyCall: s.dailyStartTime,
    dailyWrap: s.dailyEndTime,
    capacity: s.marshalsNeeded,
    rateGBP: s.rate,
    rateUnit: s.rateUnit,
    duties: s.duties,
    parkingTravel: s.parkingTravel,
    requirements: s.experienceNotes,
    engagementTerms: s.engagementTerms,
  };
}

export function briefVersion(shift: Shift) {
  return createHash("sha256")
    .update(JSON.stringify(vacancyBrief(shift)))
    .digest("hex");
}

export type Clearance = {
  activeSlot: string | null;
  briefVersion: string;
  expiresAt: Date;
  viewers: string[];
  applicants: string[];
  bookable: string[];
};

export function clearedFor(
  shift: Shift,
  release: Clearance | null,
  stage: "advert" | "view" | "apply" | "book",
  marshalId?: string,
  now = new Date(),
) {
  if (
    !release ||
    release.activeSlot !== "GB-pilot" ||
    release.expiresAt <= now ||
    !shift.engagementTerms ||
    shift.marshalsNeeded > 3 ||
    shift.paused ||
    release.briefVersion !== briefVersion(shift)
  )
    return false;
  if (stage === "advert") return true;
  if (!marshalId || !release.viewers.includes(marshalId)) return false;
  if (stage === "view") return true;
  if (!release.applicants.includes(marshalId)) return false;
  return stage === "apply" || release.bookable.includes(marshalId);
}
