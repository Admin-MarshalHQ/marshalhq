import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFounderEmail } from "@/lib/access";
import { VersionBadge } from "@/components/VersionBadge";

export const metadata: Metadata = {
  title: "MarshalHQ",
  description: "UK film and TV location marshal staffing.",
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

  return (
    <html lang="en-GB">
      <body className="min-h-screen">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-brand-navy"
              aria-label="MarshalHQ home"
            >
              <span className="text-[15px] font-semibold tracking-tight">
                Marshal<span className="text-brand-gold">HQ</span>
              </span>
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
              {!userId && (
                <>
                  <Link
                    href="/early-access"
                    className="rounded-md border border-ink bg-ink px-3 py-1.5 text-white hover:opacity-90"
                  >
                    Join waitlist
                  </Link>
                  <Link href="/login" className="text-ink-muted hover:text-ink">
                    Log in
                  </Link>
                  <Link href="/signup" className="text-ink-muted hover:text-ink">
                    Sign up
                  </Link>
                </>
              )}
              {userId && role === "MANAGER" && (
                <>
                  <Link href="/manager" className="text-ink-muted hover:text-ink">
                    Dashboard
                  </Link>
                  <Link
                    href="/manager/shifts/new"
                    className="text-ink-muted hover:text-ink"
                  >
                    Post shift
                  </Link>
                </>
              )}
              {userId && role === "MARSHAL" && (
                <>
                  <Link
                    href="/marshal/shifts"
                    className="text-ink-muted hover:text-ink"
                  >
                    Browse shifts
                  </Link>
                  <Link href="/marshal" className="text-ink-muted hover:text-ink">
                    My applications
                  </Link>
                </>
              )}
              {founder && (
                <Link
                  href="/founder"
                  className="rounded-md border border-line px-2 py-1 text-ink-muted hover:bg-surface-subtle hover:text-ink"
                >
                  Founder
                </Link>
              )}
              {userId && (
                <>
                  <Link
                    href="/notifications"
                    className="text-ink-muted hover:text-ink"
                  >
                    Inbox
                    {unread > 0 && (
                      <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {unread}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/settings"
                    className="text-ink-muted hover:text-ink"
                  >
                    Account
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button
                      type="submit"
                      className="text-ink-muted hover:text-ink"
                    >
                      Log out
                    </button>
                  </form>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto mt-8 max-w-5xl px-4 py-6 text-xs text-ink-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/rules">Platform rules</Link>
              <Link href="/support">Support</Link>
            </div>
            <VersionBadge />
          </div>
        </footer>
      </body>
    </html>
  );
}
