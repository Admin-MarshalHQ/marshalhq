export function PreviewCards() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-mute">
            What pilot users see
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy sm:text-3xl">
            Workflow, not noise.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-brand-mute">
            Illustrative views of what a manager and a marshal actually use.
            Structured shift detail, applicant review, contact released after
            acceptance.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <ShiftPreviewCard />
          <ApplicantPreviewCard />
        </div>
      </div>
    </section>
  );
}

function ShiftPreviewCard() {
  return (
    <article
      aria-label="Illustrative open shift card"
      className="rounded-lg border border-brand-hairline bg-brand-cream p-5 sm:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-mute">
          Open shift — illustrative
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-brand-forest">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-brand-forest"
            aria-hidden
          />
          Open
        </span>
      </header>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-brand-navy">
        Location marshal — exterior unit base
      </h3>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-brand-mute">
            Production type
          </dt>
          <dd className="mt-0.5 text-sm text-brand-navy">UK feature, drama</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-brand-mute">
            Region
          </dt>
          <dd className="mt-0.5 text-sm text-brand-navy">Greater London</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-brand-mute">
            Call time
          </dt>
          <dd className="mt-0.5 text-sm text-brand-navy">05:30, prep night</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-brand-mute">
            Wrap
          </dt>
          <dd className="mt-0.5 text-sm text-brand-navy">19:00, same day</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-brand-hairline pt-4 text-sm leading-relaxed text-brand-mute">
        Public realm cordon. Quiet residential street. Liaison with unit
        manager and council parking marshal.
      </p>
    </article>
  );
}

function ApplicantPreviewCard() {
  return (
    <article
      aria-label="Illustrative applicant review card"
      className="rounded-lg border border-brand-hairline bg-white p-5 shadow-[0_1px_0_rgba(6,20,46,0.04)] sm:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-mute">
          Applicant review — illustrative
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-medium text-brand-navy">
          Manager view
        </span>
      </header>
      <ul className="mt-4 space-y-3">
        <li className="flex items-start justify-between gap-3 rounded-md border border-brand-hairline bg-brand-cream px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-brand-navy">Applicant A</p>
            <p className="text-xs text-brand-mute">
              Profile complete · Prior completed shift
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-brand-forest">
            Accepted
          </span>
        </li>
        <li className="flex items-start justify-between gap-3 rounded-md border border-brand-hairline px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-brand-navy">Applicant B</p>
            <p className="text-xs text-brand-mute">Profile complete</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-medium text-brand-mute">
            Reviewed
          </span>
        </li>
        <li className="flex items-start justify-between gap-3 rounded-md border border-brand-hairline px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-brand-navy">Applicant C</p>
            <p className="text-xs text-brand-mute">Profile complete</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-medium text-brand-mute">
            Reviewed
          </span>
        </li>
      </ul>
      <div className="mt-4 rounded-md border border-brand-forest/30 bg-[#F0F7F2] px-3 py-2.5 text-sm leading-relaxed text-brand-navy">
        <span className="font-medium">Contact details now visible.</span>{" "}
        <span className="text-brand-mute">
          Released to the manager only after acceptance.
        </span>
      </div>
    </article>
  );
}
