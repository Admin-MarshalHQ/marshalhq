import Link from "next/link";

const MANAGER_POINTS = [
  "Post structured location marshal shifts.",
  "Review applicants in one place.",
  "Release contact details after acceptance.",
  "Keep a record of completed shifts.",
];

const MARSHAL_POINTS = [
  "Build a credible marshal profile.",
  "Apply clearly to relevant shifts.",
  "Receive contact details once accepted.",
  "Build early trust history through completed work.",
];

export function ValueCards() {
  return (
    <section className="bg-brand-cream">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <ValueCard
            label="For production managers"
            heading="A quieter way to fill a marshal slot."
            points={MANAGER_POINTS}
            ctaHref="/signup"
            ctaLabel="Post a shift"
          />
          <ValueCard
            label="For location marshals"
            heading="Apply for credible UK production work."
            points={MARSHAL_POINTS}
            ctaHref="/signup"
            ctaLabel="Create your profile"
          />
        </div>
      </div>
    </section>
  );
}

function ValueCard({
  label,
  heading,
  points,
  ctaHref,
  ctaLabel,
}: {
  label: string;
  heading: string;
  points: string[];
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-brand-hairline bg-white p-6 shadow-[0_1px_0_rgba(6,20,46,0.04)] sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-mute">
        {label}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-brand-navy">
        {heading}
      </h3>
      <ul className="mt-5 flex-1 space-y-2.5">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-start gap-3 text-sm leading-relaxed text-brand-navy"
          >
            <svg
              viewBox="0 0 24 24"
              className="mt-1 h-4 w-4 shrink-0 text-brand-forest"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center rounded-md border border-brand-navy bg-white px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-cream"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
