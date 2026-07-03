import Image from "next/image";

const LOGO_ASSETS = {
  mark: {
    src: "/brand/marshalhq-mark.png",
    width: 272,
    height: 230,
    sizes: "48px",
  },
  wordmark: {
    src: "/brand/marshalhq-wordmark.png",
    width: 1130,
    height: 230,
    sizes: "(max-width: 720px) 132px, 170px",
  },
} as const;

type BrandLogoProps = {
  variant?: keyof typeof LOGO_ASSETS;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({
  variant = "wordmark",
  className = "",
  priority,
  alt = "MarshalHQ",
}: BrandLogoProps) {
  const asset = LOGO_ASSETS[variant];

  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={alt}
      priority={priority}
      sizes={asset.sizes}
      className={`brand-logo brand-logo--${variant}${className ? ` ${className}` : ""}`}
    />
  );
}
