import Link from "next/link";
import clsx from "clsx";
import type {
  ApplicationStatus,
  ShiftStatus,
} from "@/lib/types";
import {
  APPLICATION_STATUS_LABEL,
  SHIFT_STATUS_LABEL,
} from "@/lib/state";

// Shared presentational primitives. This file must stay hook-free ("use
// client" free): it is imported by server pages and client forms alike.
// Anything interactive lives in its own client component (AppNav,
// ConfirmButton, the form components).

export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={clsx(
        "font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[32px] items-center gap-1 text-sm text-ink-muted hover:text-ink"
    >
      <span aria-hidden>←</span> {children}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  kicker,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  back?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-line pb-4">
      {back && (
        <div className="mb-2">
          <BackLink href={back.href}>{back.label}</BackLink>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {kicker && <Kicker className="mb-1.5">{kicker}</Kicker>}
          <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Card({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "sunken" | "highlight";
}) {
  return (
    <div
      className={clsx(
        "rounded-md border p-4",
        variant === "sunken" && "border-line bg-surface-subtle",
        variant === "highlight" &&
          "border-line border-t-2 border-t-gold bg-white shadow-[0_1px_0_rgba(28,25,21,0.03)]",
        variant === "default" &&
          "border-line bg-white shadow-[0_1px_0_rgba(28,25,21,0.03)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </div>
      <div
        className={clsx(
          error &&
            "[&_input]:border-danger [&_select]:border-danger [&_textarea]:border-danger",
        )}
      >
        {children}
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="pr-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        {title}
      </legend>
      {description && (
        <p className="mb-3 text-xs text-ink-soft">{description}</p>
      )}
      <div className="mt-2 space-y-4">{children}</div>
    </fieldset>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  className,
  ...rest
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:opacity-90 disabled:opacity-50"
      : variant === "secondary"
        ? "border border-line-strong bg-white text-ink hover:bg-surface-subtle"
        : variant === "danger"
          ? "border border-danger bg-white text-danger hover:bg-danger-soft"
          : "text-ink-muted hover:text-ink";
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex min-h-[40px] items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition",
        styles,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:opacity-90"
      : variant === "secondary"
        ? "border border-line-strong bg-white text-ink hover:bg-surface-subtle"
        : variant === "danger"
          ? "border border-danger bg-white text-danger hover:bg-danger-soft"
          : "text-accent underline-offset-2 hover:underline";
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex min-h-[40px] items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium",
        styles,
        className,
      )}
    >
      {children}
    </Link>
  );
}

// One status system for the whole product. Every badge maps a workflow state
// to a tone; the dot + mono label reads at a glance on a phone. Tones use the
// *-soft/-DEFAULT token pairs — never hardcode status hex in markup.
type BadgeTone = "neutral" | "ok" | "accent" | "danger" | "gold";

function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  const styles: Record<BadgeTone, string> = {
    neutral: "bg-surface-sunken text-ink-muted",
    ok: "bg-ok-soft text-ok",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
    gold: "bg-gold-soft text-gold-ink",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.04em]",
        styles[tone],
      )}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
      />
      {label}
    </span>
  );
}

const SHIFT_STATUS_TONE: Record<ShiftStatus, BadgeTone> = {
  DRAFT: "neutral",
  OPEN: "ok",
  FILLED: "accent",
  CLOSED: "danger",
  COMPLETED: "gold",
};

export function ShiftStatusBadge({ status }: { status: string }) {
  const s = status as ShiftStatus;
  return <StatusBadge label={SHIFT_STATUS_LABEL[s]} tone={SHIFT_STATUS_TONE[s]} />;
}

const APPLICATION_STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  APPLIED: "neutral",
  ACCEPTED: "ok",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
};

export function ApplicationStatusBadge({
  status,
}: {
  status: string;
}) {
  const s = status as ApplicationStatus;
  return (
    <StatusBadge
      label={APPLICATION_STATUS_LABEL[s]}
      tone={APPLICATION_STATUS_TONE[s]}
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-white/60 p-10 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "danger" | "warn";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-ok/30 bg-ok-soft text-ok"
      : tone === "danger"
        ? "border-danger/30 bg-danger-soft text-danger"
        : tone === "warn"
          ? "border-warn/30 bg-warn-soft text-warn"
          : "border-line bg-surface-subtle text-ink-muted";
  return (
    <div
      className={clsx(
        "rounded-md border px-3 py-2 text-sm",
        styles,
      )}
    >
      {children}
    </div>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function DL({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            {it.label}
          </dt>
          <dd className="mt-0.5 text-sm text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// --- Operational primitives -------------------------------------------------

// The manager dashboard's action queue. Each item is one place the staffing
// loop is waiting on the user; the whole row is a link to where the action
// happens.
export function AttentionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-gold/40 bg-white shadow-[0_1px_0_rgba(28,25,21,0.03)]">
      <div className="border-b border-gold/30 bg-gold-soft px-4 py-2">
        <Kicker className="!text-gold-ink">Needs your attention</Kicker>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </div>
  );
}

export function AttentionItem({
  href,
  title,
  meta,
  count,
}: {
  href: string;
  title: string;
  meta?: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-subtle"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {meta && (
          <span className="mt-0.5 block text-xs text-ink-soft">{meta}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {typeof count === "number" && (
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[11px] font-medium text-gold-ink">
            {count}
          </span>
        )}
        <span aria-hidden className="text-ink-soft">
          →
        </span>
      </span>
    </Link>
  );
}

// "2/3 booked" with slot dots. Falls back to text alone past 8 slots.
export function CapacityMeter({
  booked,
  needed,
  className,
}: {
  booked: number;
  needed: number;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      {needed <= 8 && (
        <span aria-hidden className="inline-flex items-center gap-1">
          {Array.from({ length: needed }, (_, i) => (
            <span
              key={i}
              className={clsx(
                "h-2 w-2 rounded-full",
                i < booked ? "bg-accent" : "border border-line-strong bg-white",
              )}
            />
          ))}
        </span>
      )}
      <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-muted">
        {booked}/{needed} booked
      </span>
    </span>
  );
}

// The contact-release moment, shown identically on both sides of the accepted
// pair. Purely presentational — every caller keeps its own guards; this
// component never decides *whether* contact may be shown, only how the two
// states look. released=false states the release rule; released=true is the
// gold-stamped card.
export function ContactCard({
  released,
  title,
  body,
  items,
  children,
}: {
  released: boolean;
  title: string;
  body: string;
  items?: { label: string; value: React.ReactNode }[];
  children?: React.ReactNode;
}) {
  if (!released) {
    return (
      <div className="rounded-md border border-dashed border-line-strong bg-surface-subtle p-4">
        <Kicker>{title}</Kicker>
        <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
        {children}
      </div>
    );
  }
  return (
    <Card variant="highlight">
      <div className="mb-3 inline-flex items-center gap-2 rounded border border-dashed border-gold px-2 py-1">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-ink">
          {title}
        </span>
      </div>
      {items && <DL items={items} />}
      {children}
      <p className="mt-3 border-t border-line pt-2.5 text-xs text-ink-soft">
        {body}
      </p>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <Kicker>{label}</Kicker>
      <p className="mt-1 font-serif text-3xl leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-md border border-line bg-white p-4 shadow-[0_1px_0_rgba(28,25,21,0.03)] hover:bg-surface-subtle"
      >
        {body}
      </Link>
    );
  }
  return <Card>{body}</Card>;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-surface-sunken",
        className,
      )}
    />
  );
}

// Compact date block for shift rows: weekday over day+month, mono. Multi-day
// blocks show the start date; the row's text carries the full range.
export function DateBlock({ date }: { date: Date | string }) {
  const d = typeof date === "string" ? new Date(date) : date;
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return (
    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-line bg-surface-subtle font-mono leading-none">
      <span className="text-[10px] uppercase tracking-[0.06em] text-ink-soft">
        {weekday}
      </span>
      <span className="mt-0.5 text-base font-semibold text-ink">{day}</span>
      <span className="text-[10px] uppercase tracking-[0.06em] text-ink-soft">
        {month}
      </span>
    </span>
  );
}
