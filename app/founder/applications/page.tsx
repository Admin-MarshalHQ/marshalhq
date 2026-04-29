import Link from "next/link";
import { prisma } from "@/lib/db";
import { ApplicationStatusBadge, Card, PageHeader } from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";

export default async function FounderApplicationsPage() {
  const applications = await prisma.application.findMany({
    orderBy: { appliedAt: "desc" },
    take: 200,
    include: {
      marshal: {
        select: {
          email: true,
          marshalProfile: { select: { id: true, fullName: true, paused: true } },
        },
      },
      shift: {
        select: {
          id: true,
          productionName: true,
          startDate: true,
          endDate: true,
          dailyStartTime: true,
          dailyEndTime: true,
          status: true,
          paused: true,
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle={`${applications.length} most recent. Status reflects the live workflow state.`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Marshal</th>
                <th className="py-2 pr-4">Shift</th>
                <th className="py-2 pr-4">Applied</th>
                <th className="py-2 pr-4">Decided</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-b border-line/60">
                  <td className="py-2 pr-4">
                    {a.marshal.marshalProfile ? (
                      <Link
                        href={`/founder/profiles/${a.marshal.marshalProfile.id}`}
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        {a.marshal.marshalProfile.fullName}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">{a.marshal.email}</span>
                    )}
                    {a.marshal.marshalProfile?.paused && (
                      <span className="ml-2 rounded-full bg-[#fbf1e3] px-2 py-0.5 text-[10px] text-warn">
                        Marshal paused
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/founder/shifts/${a.shift.id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {a.shift.productionName}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {formatShiftBlock(
                        a.shift.startDate,
                        a.shift.endDate,
                        a.shift.dailyStartTime,
                        a.shift.dailyEndTime,
                      )}{" "}
                      · shift {a.shift.status}
                      {a.shift.paused ? " · paused" : ""}
                    </p>
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {a.appliedAt.toLocaleString("en-GB")}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {a.decidedAt?.toLocaleString("en-GB") ?? "\u2014"}
                  </td>
                  <td className="py-2">
                    <ApplicationStatusBadge status={a.status} />
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
