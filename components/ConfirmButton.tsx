"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import clsx from "clsx";

// Small, focused confirm-modal primitive for destructive workflow actions.
//
// The trigger button is always the outermost element so parent layouts can keep
// treating it like any other button. Clicking it opens a dialog with plain
// operational copy explaining the consequence; only the Confirm button inside
// the dialog invokes the server action.
//
// Designed around Next.js server actions: `action` is a bound server action the
// parent page creates (e.g. `async () => { "use server"; await closeShiftAction(id); }`).
// Server action redirects propagate through startTransition as normal.

type Variant = "primary" | "secondary" | "danger";

function triggerClasses(variant: Variant): string {
  if (variant === "danger") {
    return "border border-danger bg-white text-danger hover:bg-[#fbecec]";
  }
  if (variant === "secondary") {
    return "border border-line bg-white text-ink hover:bg-surface-subtle";
  }
  return "bg-ink text-white hover:opacity-90";
}

function confirmClasses(variant: Variant): string {
  if (variant === "danger") {
    return "bg-danger text-white hover:opacity-90";
  }
  if (variant === "secondary") {
    return "bg-ink text-white hover:opacity-90";
  }
  return "bg-ink text-white hover:opacity-90";
}

export default function ConfirmButton({
  action,
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "primary",
  disabled,
  className,
}: {
  action: () => Promise<void>;
  triggerLabel: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Move focus into the dialog so keyboard users can confirm or cancel without
    // hunting for the modal; Escape dismisses without firing the action.
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isPending]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={clsx(
          "inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50",
          triggerClasses(variant),
          className,
        )}
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-md border border-line bg-white p-5 shadow-lg">
            <p
              id="confirm-title"
              className="text-base font-semibold text-ink"
            >
              {title}
            </p>
            <div className="mt-2 text-sm text-ink-muted">{description}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await action();
                    // If the action redirects (the usual case for these flows),
                    // this component unmounts before we reach this line.
                    setOpen(false);
                  });
                }}
                className={clsx(
                  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50",
                  confirmClasses(variant),
                )}
              >
                {isPending ? "Working\u2026" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
