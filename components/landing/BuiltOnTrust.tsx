const BULLETS = [
  "Marshals create credible profiles before applying.",
  "Managers review applicants in one place.",
  "Contact details release only after acceptance.",
  "Completed shifts begin a marshal's early trust history.",
];

export function BuiltOnTrust() {
  return (
    <section
      id="trust"
      className="scroll-mt-24 bg-brand-navy"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-gold">
              Built on trust
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Controlled contact release is the point.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/80">
              Production work depends on the right person showing up and being
              briefed cleanly. MarshalHQ is built around that — a credible
              profile, a clear application, and a controlled handover.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ul className="grid gap-3 sm:grid-cols-2">
              {BULLETS.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4"
                >
                  <span
                    className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed text-white">
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
