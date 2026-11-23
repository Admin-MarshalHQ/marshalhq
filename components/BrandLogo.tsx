import Image from "next/image";
import clsx from "clsx";

export function BrandLogo({ className, alt = "Setru" }: { className?: string; alt?: string }) {
  return (
    <span
      className={clsx("brand-logo", className)}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <Image src="/brand/setru-mark.svg" width={28} height={28} alt="" className="brand-logo__mark" unoptimized loading="eager" />
      <span>Setru</span>
    </span>
  );
}
