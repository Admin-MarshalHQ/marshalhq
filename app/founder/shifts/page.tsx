import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, ShiftStatusBadge } from "@/components/ui";
import { formatRate, formatShiftBlock } from "@/lib/format";

export default async function FounderShiftsPage() {
  const shifts = await prisma.shift.findMany({
    orderBy: [{ paused: "desc" }, { createdAt: "desc" }],
    include: {
      manager: {
        select: {
          email: true,
          managerProfile: { select: { companyName: true } },
        },
      },
      _count: { select: { applications: true } },
    },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Shifts"
        subtitle={`${shifts.length} shifts \u2014 paused shifts are hidden from marshal browsing and reject new applications at the server-action level.`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Production</th>
                <th className="py-2 pr-4">Manager</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Apps</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Paused</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/founder/shifts/${s.id}`}
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      {s.productionName}
                    </Link>
                    <p className="text-xs text-ink-soft">{s.location}</p>
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {s.manager.managerProfile?.companyName ?? s.manager.email}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {formatShiftBlock(
                      s.startDate,
                      s.endDate,
                      s.dailyStartTime,
                      s.dailyEndTime,
                    )}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {formatRate(s.rate, s.rateUnit)}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {s._count.applications}
                  </td>
                  <td className="py-2 pr-4">
                    <ShiftStatusBadge status={s.status} />
                  </td>
                  <td className="py-2">
                    {s.paused ? (
                      <span className="rounded-full bg-[#fbf1e3] px-2 py-0.5 text-xs text-warn">
                        Paused
                      </span>
                    ) : (
                      <span className="text-xs text-ink-soft">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
