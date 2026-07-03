type Step = string;

const MANAGER_STEPS: Step[] = [
  "Post a structured location marshal shift.",
  "Receive applicants from credible marshal profiles.",
  "Review applicants in one place.",
  "Accept one marshal.",
  "Contact details release after acceptance.",
  "Mark the shift completed when wrap is called.",
];

const MARSHAL_STEPS: Step[] = [
  "Create a credible marshal profile.",
  "Browse open shifts in UK film and TV production.",
  "Apply clearly to relevant work.",
  "Wait for the manager's review and decision.",
  "Receive contact details once you are accepted.",
  "Build early trust history through completed shifts.",
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-mute">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy sm:text-3xl">
            One loop. Two roles. Honest about the MVP.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-brand-mute">
            MarshalHQ is a focused staffing tool for one specific role on UK
            productions: location marshals. Managers and marshals meet through
            one structured loop — post a shift, review applicants, accept one,
            release contact details, complete the shift.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Column
            anchorId="for-managers"
            label="For managers"
            heading="Post and review with structure."
            steps={MANAGER_STEPS}
          />
          <Column
            anchorId="for-marshals"
            label="For marshals"
            heading="Apply with a credible profile."
            steps={MARSHAL_STEPS}
          />
        </div>
      </div>
    </section>
  );
}

function Column({
  anchorId,
  label,
  heading,
  steps,
}: {
  anchorId: string;
  label: string;
  heading: string;
  steps: Step[];
}) {
  return (
    <div
      id={anchorId}
      className="scroll-mt-24 rounded-lg border border-brand-hairline bg-brand-cream p-6 sm:p-8"
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-mute">
        {label}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-brand-navy">
        {heading}
      </h3>
      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-brand-navy">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
