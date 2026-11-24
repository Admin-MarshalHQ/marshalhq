import type { Prisma } from "@prisma/client";
import { attendanceLabels } from "@/lib/attendance";
import { recordedDays } from "@/lib/run-attendance";
import { formatDate } from "@/lib/format";

export function RunAttendance({ days, releasedFrom }: { days: Prisma.JsonValue; releasedFrom: Date | null }) {
  const entries = Object.entries(recordedDays(days)).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length && !releasedFrom) return null;
  return <div className="my-2 text-sm text-ink-muted">
    {releasedFrom && <p>Released from calls starting {formatDate(releasedFrom)}.</p>}
    {entries.length > 0 && <ul>{entries.map(([date, outcome]) =>
      <li key={date}>{formatDate(date)} · {attendanceLabels[outcome]}</li>)}</ul>}
  </div>;
}
