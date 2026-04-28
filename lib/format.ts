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
