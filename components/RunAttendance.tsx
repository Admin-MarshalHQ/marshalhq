import type { Prisma } from "@prisma/client";
import { attendanceLabels, disputedRelease } from "@/lib/attendance";
import { recordedDays } from "@/lib/run-attendance";
import { formatDate } from "@/lib/format";

export function RunAttendance({ days, releasedFrom, attendance }: { days: Prisma.JsonValue; releasedFrom: Date | null; attendance: string | null }) {
  const underReview = attendance === disputedRelease;
  const firstDisputed = releasedFrom?.toISOString().slice(0, 10);
  const entries = Object.entries(recordedDays(days)).filter(([day]) => !underReview || !firstDisputed || day < firstDisputed).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length && !releasedFrom) return null;
  return <div className="my-2 text-sm text-ink-muted">
    {releasedFrom && <p>{underReview ? "Release under review for calls from" : "Released from calls starting"} {formatDate(releasedFrom)}.</p>}
    {entries.length > 0 && <ul>{entries.map(([date, outcome]) =>
      <li key={date}>{formatDate(date)} · {attendanceLabels[outcome]}</li>)}</ul>}
  </div>;
}
