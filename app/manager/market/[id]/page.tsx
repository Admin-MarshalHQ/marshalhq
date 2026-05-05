import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Alert, Card, DL, PageHeader, ShiftStatusBadge } from "@/components/ui";
import {
  formatRate,
  formatShiftBlock,
  shiftBlockLengthLabel,
} from "@/lib/format";
import { capacityLabel } from "@/lib/capacity";

export default async function ManagerMarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      manager: {
        select: {
          managerProfile: { select: { companyName: true, displayName: true } },
        },
      },
      applications: { select: { status: true } },
    },
  });
  if (!shift || shift.status === "DRAFT" || shift.paused) notFound();
  const accepted = shift.applications.filter(
    (a) => a.status === "ACCEPTED",
  ).length;

  return (
    <div>
      <PageHeader
        title={shift.productionName}
        subtitle={`Posted by ${shift.manager.managerProfile?.companyName ?? "Manager"}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />
      <div className="mb-4">
        <Link
          href="/manager/market"
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          Back to market
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card>
          <DL
            items={[
              {
                label: "When",
                value: formatShiftBlock(
                  shift.startDate,
                  shift.endDate,
                  shift.dailyStartTime,
                  shift.dailyEndTime,
                ),
              },
              { label: "Capacity", value: capacityLabel(accepted, shift.marshalsNeeded) },
              { label: "Rate", value: formatRate(shift.rate, shift.rateUnit) },
              { label: "Location", value: shift.location },
              { label: "Parking / travel", value: shift.parkingTravel ?? "-" },
            ]}
          />
          {(() => {
            const length = shiftBlockLengthLabel(shift.startDate, shift.endDate);
            return length ? <p className="mt-2 text-xs text-ink-soft">{length}</p> : null;
          })()}
          <div className="mt-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
              Duties
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink">{shift.duties}</p>
          </div>
          {shift.experienceNotes && (
            <div className="mt-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
                Experience / notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {shift.experienceNotes}
              </p>
            </div>
          )}
        </Card>
        <Card>
          <p className="text-sm font-semibold">Read-only</p>
          <div className="mt-2">
            <Alert tone="info">
              Manager accounts can browse open shifts for market visibility,
              but cannot apply or trigger marshal actions.
            </Alert>
          </div>
        </Card>
      </div>
    </div>
  );
}
