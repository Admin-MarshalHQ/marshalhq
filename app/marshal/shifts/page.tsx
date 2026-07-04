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
import { formatRate, formatShiftBlock } from "@/lib/format";

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
        kicker="Open shifts"
        title="Browse shifts"
        subtitle="Shifts accepting applications now. Contact details are released only after you're accepted."
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
        <div className="space-y-2">
          {shifts.map((s) => {
            const yourApp = s.applications[0];
            return (
              <Link
                key={s.id}
                href={`/marshal/shifts/${s.id}`}
                className="block rounded-md border border-line bg-white p-4 shadow-[0_1px_0_rgba(28,25,21,0.03)] hover:border-line-strong hover:bg-surface-subtle"
              >
                <div className="flex items-start gap-3">
                  <DateBlock date={s.startDate} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-serif text-lg leading-snug text-ink">
                        {s.productionName}
                      </p>
                      {yourApp && (
                        <ApplicationStatusBadge status={yourApp.status} />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {s.location} ·{" "}
                      {formatShiftBlock(
                        s.startDate,
                        s.endDate,
                        s.dailyStartTime,
                        s.dailyEndTime,
                      )}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-sm font-medium text-ink">
                        {formatRate(s.rate, s.rateUnit)}
                      </span>
                      <CapacityMeter
                        booked={s._count.applications}
                        needed={s.marshalsNeeded}
                      />
                      <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-soft">
                        {s.manager.managerProfile?.companyName ?? "Manager"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
