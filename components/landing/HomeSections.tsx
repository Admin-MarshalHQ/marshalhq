import { Icon, type IconName } from "@/components/Icon";
import { ApplicationStatusBadge, ShiftStatusBadge } from "@/components/ui";

const shiftFacts: { icon: IconName; label: string; value: string }[] = [
  { icon: "pin", label: "Location", value: "Hackney Wick, London" },
  { icon: "calendar", label: "Shift date", value: "23 April" },
  { icon: "clock", label: "Call to wrap", value: "07:00–17:00" },
  { icon: "pound", label: "Rate", value: "£180 per day" },
];

export function ExampleShift() {
  return (
    <div className="home-shift-stage">
      <figure className="home-shift">
        <figcaption className="home-shift-caption">
          <Icon name="clipboard" className="size-4 shrink-0" /> Example shift · no live vacancy
        </figcaption>
        <div className="home-shift-body">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-ink-muted">Exterior unit · Example production</p>
              <p className="home-shift-role">Location marshal</p>
            </div>
            <ShiftStatusBadge status="OPEN" />
          </div>
          <dl className="home-shift-facts">
            {shiftFacts.map(({ icon, label, value }) => (
              <div key={label} className="relative pl-5">
                <dt className="text-xs text-ink-muted">
                  <Icon name={icon} className="absolute left-0 top-0 size-4 text-coral-ink" />
                  {label}
                </dt>
                <dd className="mt-0.5 text-[0.8125rem] font-semibold leading-snug">{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="home-shift-brief">
            <div>
              <dt>Duties</dt>
              <dd>Direct pedestrians around the set and keep the unit entrance clear.</dd>
            </div>
            <div>
              <dt>Travel</dt>
              <dd>Five minutes from the Overground. No crew parking.</dd>
            </div>
          </dl>
        </div>
      </figure>
    </div>
  );
}

const managerReview: { icon: IconName; label: string; value: string }[] = [
  { icon: "clipboard", label: "Experience", value: "Exterior units and public-facing work" },
  { icon: "calendar", label: "Availability", value: "Check the full call-to-wrap window" },
  { icon: "pin", label: "Travel", value: "Check base, travel radius and transport" },
];

export function Audience() {
  return (
    <section id="who" className="home-section home-audience" aria-labelledby="who-heading">
      <div className="marketing-width">
        <h2 id="who-heading" className="home-section-title">Who it’s for</h2>
        <div className="home-audience-grid">
          <article id="managers" className="home-audience-panel home-manager" aria-labelledby="manager-heading">
            <div>
              <p className="home-eyebrow">For location managers</p>
              <h3 id="manager-heading">Fill the shift with confidence.</h3>
              <p className="home-audience-copy">
                Post one structured brief, review applications together and compare practical fit.
                Accept the marshals you need, then share contact details.
              </p>
            </div>
            <figure className="home-manager-preview">
              <figcaption><span>Applicant review</span><span>Example view</span></figcaption>
              <dl>
                {managerReview.map(({ icon, label, value }) => (
                  <div key={label}>
                    <dt><Icon name={icon} className="size-4 shrink-0" />{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </figure>
          </article>

          <article id="marshals" className="home-audience-panel home-marshal" aria-labelledby="marshal-heading">
            <div>
              <p className="home-eyebrow">For working marshals</p>
              <h3 id="marshal-heading">Know the job before you apply.</h3>
              <p className="home-audience-copy">
                Find shifts and check the rate, times, location and duties. Apply with your working
                profile, see the outcome and build a record of completed work.
              </p>
            </div>
            <figure className="home-marshal-preview">
              <figcaption>Example application and work history</figcaption>
              <div className="home-marshal-ticket">
                <div>
                  <Icon name="clipboard" className="size-4 shrink-0 text-coral-ink" />
                  <p><strong>Applications</strong><span>See the manager’s decision</span></p>
                </div>
                <ApplicationStatusBadge status="ACCEPTED" />
              </div>
              <div className="home-marshal-ticket">
                <div>
                  <Icon name="check" className="size-4 shrink-0 text-coral-ink" />
                  <p><strong>Work history</strong><span>See individually recorded work</span></p>
                </div>
                <ShiftStatusBadge status="COMPLETED" />
              </div>
            </figure>
          </article>
        </div>
      </div>
    </section>
  );
}

const steps = [
  { title: "Post a shift", body: "Set the dates, location, call time, rate and duties." },
  { title: "Receive applications", body: "Marshals send their working profile and can add a note." },
  { title: "Review applicants", body: "Compare experience, availability and travel in one place." },
  { title: "Accept and connect", body: "Book up to the shift’s capacity. Only the manager and each accepted marshal see each other’s contact details.", contact: true },
  { title: "Complete the shift", body: "Record attendance for each booked marshal after wrap. Either side can ask Setru to correct an outcome." },
];

export function HiringProcess() {
  return (
    <section id="loop" className="home-section home-process" aria-labelledby="process-heading">
      <div className="marketing-width">
        <h2 id="process-heading" className="home-section-title">From call time to completion</h2>
        <ol className="home-steps" role="list">
          {steps.map(({ title, body, contact }, index) => (
            <li key={title} className={contact ? "home-step home-step-contact" : "home-step"}>
              <span className="home-step-number" aria-hidden="true">{index + 1}</span>
              <div className="min-w-0 pt-1">
                <h3><span className="sr-only">Step {index + 1}. </span>{title}</h3>
                <p>{body}</p>
                {contact && (
                  <span className="home-contact-note">
                    <Icon name="shield" className="size-4 shrink-0" /> Private contact release
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const comparison = [
  { informal: "Brief shared across messages", setru: "Rate, call time and duties in one shift brief" },
  { informal: "Replies across chats and DMs", setru: "Applications and decisions on the shift" },
  { informal: "Contact and outcomes agreed separately", setru: "Contact shared after acceptance, with a record of work done" },
];

export function WhySetru() {
  return (
    <section id="why" className="home-section home-why" aria-labelledby="why-heading">
      <div className="marketing-width home-why-grid">
        <div>
          <h2 id="why-heading" className="home-section-title">Why Setru exists</h2>
          <p className="mt-3 max-w-[37ch] leading-relaxed text-ink-muted">
            Group chats and word of mouth help crews find people quickly. Setru keeps the brief,
            applications and hiring decision together on the shift.
          </p>
        </div>
        <table className="home-compare" aria-label="Ways to organise location marshal hiring">
          <thead>
            <tr><th scope="col">Hiring through chats</th><th scope="col">Hiring with Setru</th></tr>
          </thead>
          <tbody>
            {comparison.map(({ informal, setru }) => (
              <tr key={informal}><td>{informal}</td><td>{setru}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
