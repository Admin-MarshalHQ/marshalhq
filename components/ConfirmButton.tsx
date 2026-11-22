"use client";

import { useId, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "./ui";

type Variant = "primary" | "secondary" | "danger";

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
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [working, setWorking] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = working || pending;

  return (
    <>
      <Button
        variant={variant}
        disabled={disabled}
        aria-haspopup="dialog"
        className={clsx("w-full", className)}
        onClick={() => dialog.current?.showModal()}
      >
        {triggerLabel}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-white p-5 text-ink shadow-panel backdrop:bg-ink/50 sm:p-6"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight">{title}</h2>
        <div id={`${id}-description`} className="mt-2 text-sm text-ink-muted">{description}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            autoFocus
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            disabled={busy}
            onClick={() => {
              if (busy) return;
              setWorking(true);
              startTransition(async () => {
                try {
                  await action();
                  dialog.current?.close();
                } finally {
                  setWorking(false);
                }
              });
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
