import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  ButtonLink,
  DateBlock,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";

export default async function MyApplicationsPage() {
  const user = await requireRole("MARSHAL");
  const apps = await prisma.application.findMany({
    where: { marshalId: user.id },
    orderBy: { appliedAt: "desc" },
    include: { shift: true },
  });

  return (
    <div>
      <PageHeader
        title="My applications"
        subtitle="Track applications and open each record for its latest booking and contact status."
        action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
      />
      {apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body="When you apply to a shift, it will appear here with its status."
          action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
        />
      ) : (
        <div className="space-y-2">
          {apps.map((a) => (
            <Link
              key={a.id}
              href={`/marshal/applications/${a.id}`}
              className="card-link"
            >
              <div className="flex items-start gap-3">
                <DateBlock date={a.shift.startDate} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold leading-snug text-ink">
                      {a.shift.productionName}
                    </p>
                    <ApplicationStatusBadge status={a.status} />
                    <ShiftStatusBadge status={a.shift.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {a.shift.location} ·{" "}
                    {formatShiftBlock(
                      a.shift.startDate,
                      a.shift.endDate,
                      a.shift.dailyStartTime,
                      a.shift.dailyEndTime,
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
