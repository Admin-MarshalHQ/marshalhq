import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFounderEmail } from "@/lib/access";
import { VersionBadge } from "@/components/VersionBadge";
import { BrandLogo } from "@/components/BrandLogo";
import AppNav, { type NavItem } from "@/components/AppNav";
import { Icon } from "@/components/Icon";

const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/inter-latin-wght-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = localFont({
  src: "./fonts/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: "MarshalHQ",
  description:
    "A clearer way to hire location marshals for UK film and TV production.",
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#FFF7F2" };

const managerNav: NavItem[] = [
  { href: "/manager", label: "Production dashboard", mobileLabel: "Dashboard", icon: "home", exact: true },
  { href: "/manager/shifts/new", label: "Post a shift", mobileLabel: "Post shift", icon: "plus", exact: true },
];

const marshalNav: NavItem[] = [
  { href: "/marshal", label: "My dashboard", mobileLabel: "Home", icon: "home", exact: true },
  { href: "/marshal/shifts", label: "Find shifts", mobileLabel: "Shifts", icon: "calendar" },
  { href: "/marshal/applications", label: "Applications", mobileLabel: "Applications", icon: "clipboard" },
  { href: "/marshal/profile", label: "My profile", mobileLabel: "Profile", icon: "person" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  const founder = isFounderEmail(session?.user?.email);
  const unread = userId
    ? await prisma.notification.count({ where: { userId, readAt: null } })
    : 0;
  const items = userId && role === "MANAGER" ? managerNav : userId && role === "MARSHAL" ? marshalNav : [];
  const home = items[0]?.href ?? "/";

  return (
    <html lang="en-GB">
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="mhq-app-header">
          <div className="shell-width flex min-h-16 items-center justify-between gap-2">
            <Link href={home} className="brand-link" aria-label="MarshalHQ home">
              <BrandLogo alt="" />
            </Link>
            <nav aria-label="Account" className="flex flex-wrap items-center justify-end gap-1">
              {userId ? (
                <>
                  {founder && <Link href="/founder" className="shell-link">Founder</Link>}
                  <Link
                    href="/notifications"
                    className="shell-icon relative"
                    aria-label={unread ? `Inbox, ${unread} unread` : "Inbox"}
                  >
                    <Icon name="bell" />
                    {unread > 0 && (
                      <span aria-hidden="true" className="inbox-count">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </Link>
                  <Link href="/settings" className="shell-icon" aria-label="Account settings">
                    <Icon name="person" />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="shell-link">Log in</Link>
                  <Link href="/#waitlist" className="shell-link text-coral-ink">Waitlist</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <div className={items.length ? "workspace" : undefined}>
          {items.length > 0 && <AppNav items={items} />}
          <main id="main-content" tabIndex={-1} className="mhq-main">{children}</main>
        </div>
        <footer className="mhq-app-footer">
          <div className="shell-width flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm text-ink-muted">
            <nav className="flex flex-wrap gap-x-4" aria-label="Support and legal">
              <Link className="shell-link" href="/terms">Terms</Link>
              <Link className="shell-link" href="/privacy">Privacy</Link>
              <Link className="shell-link" href="/rules">Platform rules</Link>
              <Link className="shell-link" href="/support">Support</Link>
            </nav>
            <div className="flex flex-wrap items-center gap-x-4">
              {userId && (
                <form action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}>
                  <button type="submit" className="shell-link">Log out</button>
                </form>
              )}
              <VersionBadge />
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
