import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ButtonLink,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { ShiftListing } from "@/components/ShiftListing";
import { isShiftSchedulable } from "@/lib/state";

export default async function BrowseShiftsPage() {
  const user = await requireRole("MARSHAL");
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  // Paused shifts are hidden from marshal browsing entirely — a paused shift
  // behaves as if the founder has taken it off the market, even if its status
  // is still OPEN in the database.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidates = await prisma.shift.findMany({
    where: {
      status: "OPEN",
      paused: false,
      startDate: { gte: today },
    },
    orderBy: [{ startDate: "asc" }, { dailyStartTime: "asc" }],
    include: {
      manager: {
        select: {
          managerProfile: { select: { companyName: true } },
        },
      },
      applications: {
        where: { marshalId: user.id },
        select: { id: true, status: true },
      },
      _count: {
        select: { applications: { where: { status: "ACCEPTED" } } },
      },
    },
  });

  const now = new Date();
  const shifts = candidates.filter((shift) => isShiftSchedulable(shift, now));

  return (
    <div>
      <PageHeader
        title="Available shifts"
        subtitle="Find location marshal work in UK film and TV."
        action={
          !profile ? (
            <ButtonLink href="/marshal/profile/edit">
              Create profile to apply
            </ButtonLink>
          ) : null
        }
      />
      {shifts.length === 0 ? (
        <EmptyState
          title="No open shifts right now"
          body="Check back soon. New shifts appear here as managers publish them."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shifts.map(shift => (
            <ShiftListing
              key={shift.id}
              shift={shift}
              byline={shift.manager.managerProfile?.companyName ?? "Manager"}
              booked={shift._count.applications}
              status={shift.applications[0]?.status}
              href={`/marshal/shifts/${shift.id}`}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
