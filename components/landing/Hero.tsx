import Link from "next/link";

export function Hero() {
  return (
    <section className="border-b border-brand-hairline bg-brand-cream">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-mute">
              UK film &amp; TV — controlled private beta
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
              Trusted staffing for location marshals in UK film &amp; TV.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-mute sm:text-[17px]">
              MarshalHQ helps location managers post structured shifts, review
              credible applicants, and release contact details only after
              acceptance.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-navy transition hover:opacity-90"
              >
                Post a shift
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-brand-navy bg-white px-5 py-3 text-sm font-semibold text-brand-navy transition hover:bg-white/70"
              >
                Sign in
              </Link>
              <Link
                href="/early-access"
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold text-brand-navy underline-offset-4 transition hover:underline"
              >
                Request early access
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-brand-mute">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-brand-forest"
                aria-hidden
              />
              Built for UK production. Backed by trust.
            </p>
          </div>
          <div className="lg:col-span-5">
            <HeroLoopCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroLoopCard() {
  const steps = [
    "Manager posts a structured shift",
    "Marshal applies with a credible profile",
    "Manager reviews applicants in one place",
    "Manager accepts one applicant",
    "Contact details release after acceptance",
    "Completion adds to early trust history",
  ];
  return (
    <div className="rounded-lg border border-brand-hairline bg-white p-5 shadow-[0_1px_0_rgba(6,20,46,0.04)] sm:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-mute">
        The trusted staffing loop
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-hairline bg-brand-cream text-[11px] font-semibold text-brand-navy">
              {i + 1}
            </span>
            <span className="text-sm leading-snug text-brand-navy">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
