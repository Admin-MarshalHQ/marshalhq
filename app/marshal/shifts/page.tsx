import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ButtonLink,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { formatRate, formatShiftBlock } from "@/lib/format";
import { APPLICATION_STATUS_LABEL } from "@/lib/state";
import type { ApplicationStatus } from "@/lib/types";

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
    },
  });

  return (
    <div>
      <PageHeader
        title="Open shifts"
        subtitle="Shifts accepting applications now. Contact details are released only after you’re accepted."
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
                className="block rounded-md border border-line bg-white p-4 hover:bg-surface-subtle"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">
                      {s.productionName}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {s.location} ·{" "}
                      {formatShiftBlock(
                        s.startDate,
                        s.endDate,
                        s.dailyStartTime,
                        s.dailyEndTime,
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {formatRate(s.rate, s.rateUnit)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Posted by{" "}
                      {s.manager.managerProfile?.companyName ?? "Manager"}
                    </p>
                  </div>
                  {yourApp && (
                    <span className="whitespace-nowrap rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">
                      You: {APPLICATION_STATUS_LABEL[yourApp.status as ApplicationStatus]}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
