import { bookedSchedule } from "@/lib/availability";
import { disputedRelease } from "@/lib/attendance";
import Link from "next/link";
import type { Application, Shift } from "@prisma/client";
import { DateBlock, StatusBadge } from "@/components/ui";
import { marshalApplicationOutcome } from "@/lib/application-outcome";
import { formatDate, formatShiftBlock } from "@/lib/format";

export function MarshalApplicationRow({ application }: {
  application: Pick<Application, "id" | "status" | "attendance" | "releasedFrom"> & { shift: Shift };
}) {
  const { id, status, shift } = application;
  const schedule = bookedSchedule(application);
  const outcome = marshalApplicationOutcome(status, shift, application.attendance);

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
            {application.releasedFrom && "Calls before release · "}{shift.location} · {formatShiftBlock(
              schedule.startDate,
              schedule.endDate,
              schedule.dailyStartTime,
              schedule.dailyEndTime,
            )}
          </p>
          {application.releasedFrom && <p>{application.attendance === disputedRelease ? "Release under review for calls from" : "Released from calls starting"} {formatDate(application.releasedFrom)}.</p>}
          <p className="mt-1 text-sm text-ink-muted">{outcome.detail}</p>
        </div>
      </div>
    </Link>
  );
}
