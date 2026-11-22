import Link from "next/link";
import type { Application, Shift } from "@prisma/client";
import { DateBlock, StatusBadge } from "@/components/ui";
import { marshalApplicationOutcome } from "@/lib/application-outcome";
import { formatShiftBlock } from "@/lib/format";

export function MarshalApplicationRow({ application }: {
  application: Pick<Application, "id" | "status"> & { shift: Shift };
}) {
  const { id, status, shift } = application;
  const outcome = marshalApplicationOutcome(status, shift);

  return (
    <Link href={`/marshal/applications/${id}`} className="card-link">
      <div className="flex flex-wrap items-start gap-3">
        <DateBlock date={shift.startDate} />
        <div className="min-w-0 flex-[1_1_12rem]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold leading-snug text-ink max-sm:line-clamp-2">
              {shift.productionName}
            </p>
            <StatusBadge label={outcome.label} tone={outcome.tone} />
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            {shift.location} · {formatShiftBlock(
              shift.startDate,
              shift.endDate,
              shift.dailyStartTime,
              shift.dailyEndTime,
            )}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{outcome.detail}</p>
        </div>
      </div>
    </Link>
  );
}
