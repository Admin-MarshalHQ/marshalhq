"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Icon";

export type NavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: IconName;
  exact?: boolean;
};

export default function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;
    const measure = () => {
      root.style.setProperty("--navigation-height", `${nav.offsetHeight}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    measure();
    return () => {
      observer.disconnect();
      root.style.removeProperty("--navigation-height");
    };
  }, []);

  return (
    <nav ref={navRef} className="workspace-nav" aria-label="Workspace">
      {items.map((item) => {
        const samePage = pathname === item.href;
        const inSection = samePage || (!item.exact && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={samePage ? "page" : inSection ? "location" : undefined}
          >
            <Icon name={item.icon} />
            <span className="workspace-nav__desktop-label">{item.label}</span>
            <span className="workspace-nav__mobile-label">{item.mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
