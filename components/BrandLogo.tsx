import clsx from "clsx";

export function BrandLogo({
  variant = "wordmark",
  className,
  alt = "MarshalHQ",
}: {
  variant?: "mark" | "wordmark";
  className?: string;
  alt?: string;
}) {
  return (
    <span
      className={clsx("brand-logo", className)}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <span className="brand-logo__mark" />
      {variant === "wordmark" && <span>MarshalHQ</span>}
    </span>
  );
}
