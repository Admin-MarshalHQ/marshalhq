import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  ButtonLink,
  CapacityMeter,
  DateBlock,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ShiftFacts } from "@/components/ShiftFacts";

export default async function BrowseShiftsPage() {
  const user = await requireRole("MARSHAL");
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  // Paused shifts are hidden from marshal browsing entirely — a paused shift
  // behaves as if the founder has taken it off the market, even if its status
  // is still OPEN in the database.
  const shifts = await prisma.shift.findMany({
    where: {
      status: "OPEN",
      paused: false,
      // Filter on startDate so a multi-day block whose first day is still in
      // the future appears, while one whose start has already passed drops
      // off the browse list.
      startDate: { gte: new Date(new Date().toDateString()) },
    },
    orderBy: [{ startDate: "asc" }],
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
          {shifts.map((shift) => {
            const application = shift.applications[0];
            return (
              <li key={shift.id} className="card-link relative min-w-0 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-ink">
                <div className="mb-3 flex items-center gap-3">
                  <DateBlock date={shift.startDate} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold leading-snug tracking-tight">
                      <Link href={`/marshal/shifts/${shift.id}`} className="after:absolute after:inset-0 after:content-['']">
                        {shift.productionName}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-muted">{shift.manager.managerProfile?.companyName ?? "Manager"}</p>
                  </div>
                  <Icon name="chevron" className="shrink-0 text-coral-ink" />
                </div>
                <ShiftFacts shift={shift} />
                <p className="mt-3 line-clamp-2 text-sm text-ink">{shift.duties}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                  <CapacityMeter booked={shift._count.applications} needed={shift.marshalsNeeded} />
                  {application && <ApplicationStatusBadge status={application.status} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
