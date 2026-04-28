import Link from "next/link";

export function MarketingFooter() {
  return (
    <section className="border-t border-brand-hairline bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className="text-base font-semibold tracking-tight text-brand-navy">
              Marshal<span className="text-brand-gold">HQ</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-mute">
              A focused staffing tool for UK film and TV location marshal work.
              Built around manager review and controlled contact release.
            </p>
          </div>
          <div className="lg:col-span-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-mute">
              Get started
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-brand-navy">
              <li>
                <Link href="/signup" className="hover:underline">
                  Create an account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:underline">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:underline">
                  Contact support
                </Link>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-mute">
              Policies
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-brand-navy">
              <li>
                <Link href="/terms" className="hover:underline">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:underline">
                  Platform rules
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
