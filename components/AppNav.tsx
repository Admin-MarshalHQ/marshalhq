"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

// Role-aware navigation for the app shell. The server layout owns the data
// (session role, unread count, the "use server" logout form passed in as a
// ReactNode slot); this component only handles active states and the mobile
// disclosure menu. An item is active on its exact path, or on sub-paths for
// non-dashboard items ("/manager/shifts/new" lights up "Post shift", not
// "Dashboard").
export default function AppNav({
  items,
  founder,
  logout,
}: {
  items: NavItem[];
  founder: boolean;
  logout?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/manager" || href === "/marshal") return pathname === href;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClasses = (href: string, mobile: boolean) =>
    clsx(
      mobile
        ? "flex min-h-[44px] items-center justify-between border-b border-line px-1 text-[15px]"
        : "inline-flex min-h-[40px] items-center border-b-2 pt-0.5 text-sm transition-colors",
      isActive(href)
        ? mobile
          ? "font-medium text-ink"
          : "border-gold font-medium text-ink"
        : mobile
          ? "text-ink-muted"
          : "border-transparent text-ink-muted hover:text-ink",
    );

  const badge = (n?: number) =>
    n && n > 0 ? (
      <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-white">
        {n}
      </span>
    ) : null;

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-5 md:flex">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={linkClasses(it.href, false)}>
            {it.label}
            {badge(it.badge)}
          </Link>
        ))}
        {founder && (
          <Link
            href="/founder"
            className={clsx(
              "inline-flex min-h-[32px] items-center rounded-md border px-2 font-mono text-[11px] uppercase tracking-[0.06em]",
              isActive("/founder")
                ? "border-line-strong bg-surface-subtle text-ink"
                : "border-line text-ink-muted hover:bg-surface-subtle hover:text-ink",
            )}
          >
            Founder
          </Link>
        )}
        {logout}
      </nav>

      {/* Mobile trigger */}
      <button
        type="button"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-line text-ink md:hidden"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden className="text-lg leading-none">
          {open ? "✕" : "☰"}
        </span>
      </button>

      {/* Mobile panel */}
      {open && (
        <div className="basis-full md:hidden">
          <nav className="mt-2 flex flex-col border-t border-line pb-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={linkClasses(it.href, true)}
              >
                <span>
                  {it.label}
                  {badge(it.badge)}
                </span>
                {isActive(it.href) && (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
                )}
              </Link>
            ))}
            {founder && (
              <Link
                href="/founder"
                className={linkClasses("/founder", true)}
              >
                Founder
              </Link>
            )}
            {logout && (
              <div className="flex min-h-[44px] items-center px-1">{logout}</div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
