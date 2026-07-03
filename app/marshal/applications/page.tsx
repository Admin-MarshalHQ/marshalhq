import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  ButtonLink,
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
        subtitle="Every shift you’ve applied to and its current state."
        action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
      />
      {apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body="When you apply to a shift, it will appear here."
          action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
        />
      ) : (
        <div className="space-y-2">
          {apps.map((a) => (
            <Link
              key={a.id}
              href={`/marshal/applications/${a.id}`}
              className="block rounded-md border border-line bg-white p-4 hover:bg-surface-subtle"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ApplicationStatusBadge status={a.status} />
                    <ShiftStatusBadge status={a.shift.status} />
                    <p className="truncate text-base font-semibold">
                      {a.shift.productionName}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
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
