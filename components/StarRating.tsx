import clsx from "clsx";
import type { RatingSummary } from "@/lib/reviews";

/**
 * Read-only star display. Renders five glyphs filled to the nearest whole star
 * and an optional "(N)" count. Server-component safe — no client JS.
 */
export function StarRatingDisplay({
  summary,
  className,
  emptyLabel = "No ratings yet",
}: {
  summary: RatingSummary;
  className?: string;
  emptyLabel?: string;
}) {
  if (summary.count === 0) {
    return <span className={clsx("text-sm text-ink-soft", className)}>{emptyLabel}</span>;
  }
  const filled = Math.round(summary.average);
  return (
    <span
      className={clsx("inline-flex items-center gap-1 text-sm", className)}
      aria-label={`${summary.average.toFixed(1)} out of 5 from ${summary.count} ${
        summary.count === 1 ? "rating" : "ratings"
      }`}
    >
      <span className="text-gold" aria-hidden>
        {"★".repeat(filled)}
        <span className="text-line">{"★".repeat(5 - filled)}</span>
      </span>
      <span className="text-ink-muted">
        {summary.average.toFixed(1)} ({summary.count})
      </span>
    </span>
  );
}
