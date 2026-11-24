import Link from "next/link";
import { Icon } from "./Icon";
import { ShiftFacts } from "./ShiftFacts";
import { ApplicationStatusBadge, CapacityMeter, DateBlock } from "./ui";

type ListingShift = Parameters<typeof ShiftFacts>[0]["shift"] & {
  productionName: string; duties: string; marshalsNeeded: number;
};

export function ShiftListing({ shift, byline, booked, status, href, featured }: {
  shift: ListingShift; byline: string; booked: number; status?: string; href: string; featured?: boolean;
}) {
  const title = <span className="max-sm:line-clamp-2">{shift.productionName}</span>;
  const linkClass = "after:absolute after:inset-0 after:rounded-lg after:content-['']";
  return (
    <li className={`card-link relative min-w-0 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-ink ${featured ? "border-t-2 border-t-coral-action" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <DateBlock date={shift.startDate} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug tracking-tight">
            {href.startsWith("#") ? <a href={href} className={linkClass}>{title}</a> : <Link href={href} className={linkClass}>{title}</Link>}
          </h2>
          <p className={`mt-0.5 text-sm text-ink-muted ${featured ? "" : "max-sm:truncate"}`}>{byline}</p>
        </div>
        <Icon name="chevron" className="shrink-0 text-coral-ink" />
      </div>
      <ShiftFacts shift={shift} />
      <p className={`mt-3 text-sm text-ink ${featured ? "" : "line-clamp-2"}`}>{shift.duties}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <CapacityMeter booked={booked} needed={shift.marshalsNeeded} />
        {status && <ApplicationStatusBadge status={status} />}
        {featured && <span className="ml-auto text-sm font-bold text-coral-ink">View shift →</span>}
      </div>
    </li>
  );
}
