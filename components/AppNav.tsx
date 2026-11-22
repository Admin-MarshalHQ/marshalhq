"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav className="workspace-nav" aria-label="Workspace">
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
