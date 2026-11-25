import { pilotDocuments } from "@/lib/pilot-documents";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { invitedMarshalAddresses, invitedRole } from "@/lib/pilot-participant";
import { clearedFor } from "@/lib/vacancy-brief";

// Use this filter in the query which selects the applicant's profile and note.
// Replacing or holding a release changes activeSlot on the old row. Checking
// that same row again prevents a stale first read from authorising disclosure.
export async function managerApplicationAccess(
  managerId: string,
  db: Pick<Prisma.TransactionClient, "vacancyRelease"> = prisma,
): Promise<Prisma.ApplicationWhereInput> {
  const bookings: Prisma.ApplicationWhereInput = {
    status: { in: ["ACCEPTED", "PRODUCTION_CANCELLED"] },
  };
  const release = await db.vacancyRelease.findUnique({
    where: { activeSlot: "GB-pilot" },
    include: {
      shift: {
        include: {
          manager: {
            select: {
              email: true,
              role: true,
              disabledAt: true,
              emailVerifiedAt: true,
            },
          },
        },
      },
    },
  });
  const docs = pilotDocuments();
  const owned = { shift: { managerId } };
  if (
    !docs || !release ||
    release.shift.managerId !== managerId ||
    !clearedFor(release.shift, release, "advert") ||
    release.shift.manager.disabledAt ||
    !release.shift.manager.emailVerifiedAt ||
    invitedRole(release.shift.manager.email) !== "MANAGER"
  ) {
    return { ...owned, ...bookings };
  }
  const versions = { termsVersion: docs.termsVersion, noticeVersion: docs.noticeVersion };
  return {
    ...owned,
    OR: [
      bookings,
      {
        status: "APPLIED",
        shiftId: release.shiftId,
        termsVersion: release.briefVersion,
        marshalId: {
          in: release.applicants.filter((id) => release.viewers.includes(id)),
        },
        marshal: {
          role: "MARSHAL",
          pilotAgreements: { some: { role: "MARSHAL", ...versions } },
          disabledAt: null,
          emailVerifiedAt: { not: null },
          email: { in: invitedMarshalAddresses() },
          marshalProfile: { paused: false },
        },
        shift: {
          paused: false,
          manager: {
            role: "MANAGER",
            pilotAgreements: { some: { role: "MANAGER", ...versions } },
            disabledAt: null,
            emailVerifiedAt: { not: null },
          },
          vacancyReleases: {
            some: {
              id: release.id,
              activeSlot: "GB-pilot",
              expiresAt: { gt: new Date() },
            },
          },
        },
      },
    ],
  };
}
