import Link from "next/link";
import clsx from "clsx";
import { cloneElement, useId, type ReactElement } from "react";
import { Icon, type IconName } from "./Icon";
import type {
  ApplicationStatus,
  ShiftStatus,
} from "@/lib/types";
import {
  APPLICATION_STATUS_LABEL,
  SHIFT_STATUS_LABEL,
} from "@/lib/state";

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
        "text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft",
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
      className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-ink-muted hover:text-coral-ink"
    >
      <Icon name="back" className="size-4" /> {children}
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
    <div className="mb-6">
      {back && (
        <div className="mb-2">
          <BackLink href={back.href}>{back.label}</BackLink>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {kicker && <Kicker className="mb-1.5">{kicker}</Kicker>}
          <h1 className="text-[1.625rem] font-extrabold leading-[1.16] tracking-[-0.035em] text-ink min-[375px]:text-[1.75rem] lg:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
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
        "rounded-lg border p-4 sm:p-5",
        variant === "sunken" && "border-line bg-surface-subtle",
        variant === "highlight" &&
          "border-line border-t-2 border-t-coral-action bg-white shadow-card",
        variant === "default" &&
          "border-line bg-white shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

type FieldControl = ReactElement<{
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}>;

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: FieldControl;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  const description = [
    children.props["aria-describedby"],
    hint && `${id}-hint`,
    error && `${id}-error`,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
        {hint && <span id={`${id}-hint`} className="text-sm text-ink-muted">{hint}</span>}
      </div>
      {cloneElement(children, {
        id,
        "aria-describedby": description,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        className: clsx(children.props.className, error && "!border-danger"),
      })}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
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
    <fieldset className="min-w-0 border-t border-line pt-4">
      <legend className="pr-3 text-base font-bold text-ink">
        {title}
      </legend>
      {description && (
        <p className="mb-3 text-sm text-ink-muted">{description}</p>
      )}
      <div className="mt-2 space-y-4">{children}</div>
    </fieldset>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonBase = "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5 text-center text-sm font-bold";
const buttonTone: Record<ButtonVariant, string> = {
  primary: "bg-coral-action text-white hover:bg-coral-ink",
  secondary: "border border-line-control bg-white text-ink hover:bg-coral-soft",
  ghost: "text-coral-ink hover:bg-coral-soft",
  danger: "border border-danger bg-white text-danger hover:bg-danger-soft",
};

export function Button({
  children,
  variant = "primary",
  type = "button",
  className,
  ...rest
}: {
  variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={clsx(buttonBase, buttonTone[variant], "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted", className)}
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
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Link href={href} className={clsx(buttonBase, buttonTone[variant], className)}>
      {children}
    </Link>
  );
}

// One status system for the whole product. Every badge maps a workflow state
// to a tone. Tones use the
// *-soft/-DEFAULT token pairs — never hardcode status hex in markup.
type BadgeTone = "neutral" | "ok" | "accent" | "booked" | "danger";

function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  const styles: Record<BadgeTone, string> = {
    neutral: "bg-neutral-soft text-neutral",
    ok: "bg-ok-soft text-ok",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
    booked: "bg-booked-soft text-booked",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
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
  FILLED: "booked",
  CLOSED: "neutral",
  COMPLETED: "ok",
};

export function ShiftStatusBadge({ status }: { status: string }) {
  const s = status as ShiftStatus;
  return <StatusBadge label={SHIFT_STATUS_LABEL[s]} tone={SHIFT_STATUS_TONE[s]} />;
}

const APPLICATION_STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  APPLIED: "accent",
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
    <div className="rounded-md border border-dashed border-line-strong bg-white/80 p-5 text-center sm:p-10">
      <p className="text-lg font-bold text-ink">{title}</p>
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
      role={tone === "danger" ? "alert" : tone === "success" ? "status" : undefined}
      className={clsx("rounded-md border px-3 py-3 text-sm", styles)}
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
          <dt className="text-xs font-semibold text-ink-muted">
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
    <div className="overflow-hidden rounded-md border border-gold/40 bg-white shadow-card">
      <div className="border-b border-gold/30 bg-gold-soft px-4 py-2">
        <h2 className="text-sm font-bold text-gold-ink">Needs your attention</h2>
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
// component never decides whether contact may be shown.
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
    <Card className="!border-ok/30 !bg-ok-soft">
      <p className="mb-4 flex items-center gap-2 text-base font-bold text-ok">
        <Icon name="check" className="shrink-0" />
        {title}
      </p>
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
  icon = "clipboard",
  tone = "accent",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  icon?: IconName;
  tone?: "accent" | "ok" | "booked" | "warn" | "neutral";
}) {
  const tints = {
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
    booked: "bg-booked-soft text-booked",
    warn: "bg-warn-soft text-warn",
    neutral: "bg-neutral-soft text-neutral",
  };
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={clsx("grid size-10 shrink-0 place-items-center rounded-md", tints[tone])}>
          <Icon name={icon} />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
          <p className="mt-1 text-sm font-semibold text-ink-muted">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-sm text-ink-muted">{hint}</p>}
    </>
  );
  return href ? <Link href={href} className="card-link">{body}</Link> : <Card>{body}</Card>;
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

// The tile shows the start date. The row shows the full date range.
export function DateBlock({ date }: { date: Date | string }) {
  const d = typeof date === "string" ? new Date(date) : date;
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return (
    <span className="shift-date-tile inline-grid min-w-12 shrink-0 justify-items-center gap-0.5 whitespace-nowrap rounded-md bg-coral-soft px-1.5 py-1.5 text-xs leading-none text-coral-ink">
      <span>{weekday}</span>
      <span className="text-base font-semibold leading-none tabular-nums text-ink">{day}</span>
      <span>{month}</span>
    </span>
  );
}
