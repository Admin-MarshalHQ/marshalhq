import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";

export default async function CompletionHistoryPage() {
  const user = await requireRole("MARSHAL");
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
  });
  const completed = await prisma.application.findMany({
    where: {
      marshalId: user.id,
      status: "ACCEPTED",
      shift: { status: "COMPLETED" },
    },
    orderBy: { shift: { startDate: "desc" } },
    include: {
      shift: {
        include: {
          manager: {
            select: { managerProfile: { select: { companyName: true } } },
          },
        },
      },
    },
  });

  const reliability =
    profile && profile.completedCount > 0
      ? `${profile.reliableCount}/${profile.completedCount} rated reliable`
      : "No completed shifts yet";

  return (
    <div>
      <PageHeader
        title="Completion history"
        subtitle="Your verified record of completed MarshalHQ shifts."
      />

      <Card className="mb-4">
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          Reliability signal
        </p>
        <p className="mt-1 text-lg font-semibold text-ink">{reliability}</p>
        <p className="mt-1 text-xs text-ink-muted">
          Managers see this alongside your applications.
        </p>
      </Card>

      {completed.length === 0 ? (
        <EmptyState
          title="No completed shifts yet"
          body="Once a manager marks a booked shift complete, it will appear here."
        />
      ) : (
        <div className="space-y-2">
          {completed.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">
                    {a.shift.productionName}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {a.shift.manager.managerProfile?.companyName ?? "Manager"}{" "}
                    ·{" "}
                    {formatShiftBlock(
                      a.shift.startDate,
                      a.shift.endDate,
                      a.shift.dailyStartTime,
                      a.shift.dailyEndTime,
                    )}
                  </p>
                </div>
                {a.shift.reliabilityFlag === true && (
                  <span className="rounded-full bg-[#e7f1ea] px-2 py-0.5 text-xs font-medium text-ok">
                    Reliable
                  </span>
                )}
                {a.shift.reliabilityFlag === false && (
                  <span className="rounded-full bg-[#f3eded] px-2 py-0.5 text-xs font-medium text-danger">
                    Issue flagged
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
