import Link from "next/link";

export function BottomCTA() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="rounded-lg border border-brand-hairline bg-brand-cream p-8 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-navy sm:text-3xl">
              Ready to take part in the pilot?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-brand-mute">
              Whether you are filling a shift this week or building a credible
              profile for next month's work, MarshalHQ is for you.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-navy transition hover:opacity-90"
              >
                Create your profile
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md border border-brand-navy bg-white px-5 py-3 text-sm font-semibold text-brand-navy transition hover:bg-white/70"
              >
                Post a shift
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold text-brand-navy underline-offset-4 transition hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
