type Item = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

const ITEMS: Item[] = [
  {
    title: "Structured shifts",
    body: "Clear roles, locations, and call times — no free-text guessing.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
      </svg>
    ),
  },
  {
    title: "Manager review",
    body: "Side-by-side applicant view. The manager picks one.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="6" />
        <path d="m21 21-5.2-5.2" />
      </svg>
    ),
  },
  {
    title: "Controlled contact release",
    body: "Phone and email release only once an applicant is accepted.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
  {
    title: "Completion history",
    body: "Finished shifts begin a marshal's early trust record.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
];

export function TrustStrip() {
  return (
    <section className="border-y border-brand-hairline bg-brand-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it) => (
            <li key={it.title} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-brand-hairline bg-white text-brand-navy">
                <span className="block h-5 w-5">{it.icon}</span>
              </span>
              <div>
                <h3 className="text-sm font-semibold text-brand-navy">
                  {it.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-brand-mute">
                  {it.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
