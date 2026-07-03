import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatRate, formatShiftBlock } from "@/lib/format";
import { capacityLabel } from "@/lib/capacity";

export default async function ManagerMarketPage() {
  await requireRole("MANAGER");
  const shifts = await prisma.shift.findMany({
    take: 100,
    where: {
      status: "OPEN",
      paused: false,
      startDate: { gte: new Date(new Date().toDateString()) },
    },
    orderBy: [{ startDate: "asc" }],
    include: {
      manager: {
        select: {
          managerProfile: { select: { companyName: true } },
        },
      },
      applications: { select: { status: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Open market"
        subtitle="Read-only view of open shifts. Manager accounts cannot apply."
      />
      {shifts.length === 0 ? (
        <EmptyState
          title="No open shifts right now"
          body="Open shifts from managers appear here for market visibility."
        />
      ) : (
        <div className="space-y-2">
          {shifts.map((s) => {
            const accepted = s.applications.filter(
              (a) => a.status === "ACCEPTED",
            ).length;
            return (
              <Link
                key={s.id}
                href={`/manager/market/${s.id}`}
                className="block rounded-md border border-line bg-white p-4 hover:bg-surface-subtle"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">
                      {s.productionName}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {s.location} -{" "}
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
                      {capacityLabel(accepted, s.marshalsNeeded)} - posted by{" "}
                      {s.manager.managerProfile?.companyName ?? "Manager"}
                    </p>
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
