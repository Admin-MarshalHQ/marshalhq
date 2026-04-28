import clsx from "clsx";
import { DISPLAY_VERSION } from "@/src/generated/version";

export function VersionBadge({ className }: { className?: string }) {
  return (
    <span
      title={`Build ${DISPLAY_VERSION}`}
      className={clsx(
        "inline-flex select-none items-center rounded-full border border-line bg-surface-subtle px-2 py-0.5 font-mono text-[11px] text-ink-soft",
        className,
      )}
      data-version={DISPLAY_VERSION}
    >
      {DISPLAY_VERSION}
    </span>
  );
}
