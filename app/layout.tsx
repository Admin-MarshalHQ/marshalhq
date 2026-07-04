import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFounderEmail } from "@/lib/access";
import { VersionBadge } from "@/components/VersionBadge";
import { BrandLogo } from "@/components/BrandLogo";
import AppNav, { type NavItem } from "@/components/AppNav";

export const metadata: Metadata = {
  title: "MarshalHQ",
  description:
    "A clearer way to hire location marshals for UK film and TV production.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  const founder = isFounderEmail(session?.user?.email);

  const unread = userId
    ? await prisma.notification.count({
        where: { userId, readAt: null },
      })
    : 0;

  let items: NavItem[] = [];
  if (!userId) {
    items = [
      { href: "/#waitlist", label: "Join waitlist" },
      { href: "/login", label: "Log in" },
    ];
  } else if (role === "MANAGER") {
    items = [
      { href: "/manager", label: "Dashboard" },
      { href: "/manager/shifts/new", label: "Post shift" },
      { href: "/notifications", label: "Inbox", badge: unread },
      { href: "/settings", label: "Account" },
    ];
  } else if (role === "MARSHAL") {
    items = [
      { href: "/marshal", label: "Dashboard" },
      { href: "/marshal/shifts", label: "Browse shifts" },
      { href: "/marshal/applications", label: "My applications" },
      { href: "/marshal/profile", label: "Profile" },
      { href: "/notifications", label: "Inbox", badge: unread },
      { href: "/settings", label: "Account" },
    ];
  } else {
    items = [
      { href: "/notifications", label: "Inbox", badge: unread },
      { href: "/settings", label: "Account" },
    ];
  }

  const logout = userId ? (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="inline-flex min-h-[40px] items-center text-sm text-ink-muted hover:text-ink"
      >
        Log out
      </button>
    </form>
  ) : null;

  return (
    <html lang="en-GB">
      <body className="min-h-screen">
        <header className="mhq-app-header sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-0 px-4 py-2.5">
            <Link
              href={role === "MANAGER" ? "/manager" : role === "MARSHAL" ? "/marshal" : "/"}
              className="flex items-center text-brand-navy"
              aria-label="MarshalHQ home"
            >
              <BrandLogo className="h-8 w-auto object-contain" priority alt="" />
            </Link>
            <AppNav items={items} founder={founder} logout={logout} />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mhq-app-footer mx-auto mt-8 max-w-5xl border-t border-line px-4 py-6 text-xs text-ink-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link className="hover:text-ink" href="/terms">
                Terms
              </Link>
              <Link className="hover:text-ink" href="/privacy">
                Privacy
              </Link>
              <Link className="hover:text-ink" href="/rules">
                Platform rules
              </Link>
              <Link className="hover:text-ink" href="/support">
                Contact
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
                UK film &amp; TV location work
              </span>
              <VersionBadge />
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
