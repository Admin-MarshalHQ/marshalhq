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
        kicker="Applications"
        title="My applications"
        subtitle="Every shift you've applied to and its current state. Accepted means you're booked and contact details are available."
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
              className="block rounded-md border border-line bg-white p-4 shadow-[0_1px_0_rgba(28,25,21,0.03)] hover:bg-surface-subtle"
            >
              <div className="flex items-start gap-3">
                <DateBlock date={a.shift.startDate} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-serif text-lg leading-snug text-ink">
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
