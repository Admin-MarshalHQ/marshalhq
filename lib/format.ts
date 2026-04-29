export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRate(rate: number, unit: string): string {
  const num = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(rate);
  return `${num} / ${unit === "HOUR" ? "hr" : "day"}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start}\u2013${end}`;
}

// Compare two Dates by their UTC calendar day. Block lengths and same-day
// detection use UTC to avoid the +/-1h timezone offset rounding the day count
// up or down at midnight.
function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Render a shift's date and daily window for cards and detail "When" rows.
 *
 *   single-day:  "Mon 12 May 2025 \u00b7 06:00\u201318:00"
 *   multi-day:   "Mon 12 May 2025 to Sat 17 May 2025 \u00b7 06:00\u201318:00 daily"
 *
 * The single-day form preserves the pre-multi-day display so the common case
 * looks identical for marshals scanning a feed.
 */
export function formatShiftBlock(
  startDate: Date | string,
  endDate: Date | string,
  dailyStartTime: string,
  dailyEndTime: string,
): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const time = formatTimeRange(dailyStartTime, dailyEndTime);
  if (isSameUtcDay(start, end)) {
    return `${formatDate(start)} \u00b7 ${time}`;
  }
  return `${formatDate(start)} to ${formatDate(end)} \u00b7 ${time} daily`;
}

/**
 * "N-day shift block" sub-line for detail pages. Returns null on single-day
 * shifts so the caller can omit the sub-line entirely without conditionals.
 */
export function shiftBlockLengthLabel(
  startDate: Date | string,
  endDate: Date | string,
): string | null {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (isSameUtcDay(start, end)) return null;
  // Inclusive day count: Mon..Sat = 6 days. Round to absorb DST jitter.
  const days =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return `${days}-day shift block`;
}
