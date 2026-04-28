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

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-md border border-line bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]",
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
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </label>
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
        ? "border border-line bg-white text-ink hover:bg-surface-subtle"
        : variant === "danger"
          ? "border border-danger bg-white text-danger hover:bg-[#fbecec]"
          : "text-ink-muted hover:text-ink";
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition",
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
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:opacity-90"
      : variant === "secondary"
        ? "border border-line bg-white text-ink hover:bg-surface-subtle"
        : "text-accent underline-offset-2 hover:underline";
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium",
        styles,
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function ShiftStatusBadge({ status }: { status: string }) {
  const s = status as ShiftStatus;
  const styles: Record<ShiftStatus, string> = {
    DRAFT: "bg-surface-sunken text-ink-muted",
    OPEN: "bg-[#e7f1ea] text-ok",
    FILLED: "bg-[#e6ecf4] text-accent",
    CLOSED: "bg-[#f3eded] text-danger",
    COMPLETED: "bg-[#eeede6] text-[#6b5a00]",
  };
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        styles[s],
      )}
    >
      {SHIFT_STATUS_LABEL[s]}
    </span>
  );
}

export function ApplicationStatusBadge({
  status,
}: {
  status: string;
}) {
  const s = status as ApplicationStatus;
  const styles: Record<ApplicationStatus, string> = {
    APPLIED: "bg-surface-sunken text-ink-muted",
    ACCEPTED: "bg-[#e7f1ea] text-ok",
    REJECTED: "bg-[#f3eded] text-danger",
    WITHDRAWN: "bg-[#eeede6] text-[#6b5a00]",
  };
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        styles[s],
      )}
    >
      {APPLICATION_STATUS_LABEL[s]}
    </span>
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
    <div className="rounded-md border border-dashed border-line bg-white p-10 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
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
      ? "border-ok/30 bg-[#eef6f0] text-ok"
      : tone === "danger"
        ? "border-danger/30 bg-[#fbecec] text-danger"
        : tone === "warn"
          ? "border-warn/30 bg-[#fbf1e3] text-warn"
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
          <dt className="text-xs uppercase tracking-wide text-ink-soft">
            {it.label}
          </dt>
          <dd className="mt-0.5 text-sm text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
