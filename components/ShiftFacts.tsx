import { formatRate, formatShiftBlock } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

export function ShiftFacts({ shift }: {
  shift: {
    location: string;
    startDate: Date;
    endDate: Date;
    dailyStartTime: string;
    dailyEndTime: string;
    rate: number;
    rateUnit: string;
  };
}) {
  const [dates, ...times] = formatShiftBlock(
    shift.startDate, shift.endDate, shift.dailyStartTime, shift.dailyEndTime,
  ).split(" · ");
  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: "pin", label: "Location", value: shift.location },
    { icon: "calendar", label: "Dates", value: dates },
    { icon: "clock", label: "Hours", value: times.join(" · ") },
    { icon: "pound", label: "Rate", value: formatRate(shift.rate, shift.rateUnit) },
  ];

  return (
    <dl className="space-y-2 text-sm">
      {facts.map(({ icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5">
          <dt className="shrink-0 text-ink-muted">
            <Icon name={icon} className="mt-0.5 size-4" />
            <span className="sr-only">{label}</span>
          </dt>
          <dd className={icon === "pound" ? "font-bold" : "text-ink-muted"}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
