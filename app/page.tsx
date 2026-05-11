import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import EarlyAccessForm from "./early-access/EarlyAccessForm";

export const metadata: Metadata = {
  title: "MarshalHQ - Location marshal hiring for UK film and TV",
  description:
    "A clearer way to hire location marshals across UK film and TV production. Post structured shifts, review applicants in one place, and build early trust signals.",
};

const loopSteps = [
  {
    number: "01",
    title: "Post a structured shift",
    body:
      "A clear brief: dates, call, base, unit, notes. The same fields every time, so applicants know what they are applying to.",
  },
  {
    number: "02",
    title: "Marshals apply",
    body:
      "Working marshals see the shift, review the brief, and apply with relevant experience attached.",
  },
  {
    number: "03",
    title: "Review applicants in one place",
    body:
      "All applicants for that shift, side by side. No scrolling group chats. No forwarded CVs.",
  },
  {
    number: "04",
    title: "Accept one marshal",
    body:
      "Choose your marshal. Contact details for that person are released to both sides only after acceptance.",
  },
  {
    number: "05",
    title: "Shift completed",
    body:
      "After the shift, a small, factual record is kept, quietly building early trust signals over time.",
  },
];

const comparisonRows = [
  {
    current: "Shifts sent through WhatsApp groups",
    marshalhq: "Shifts posted with the same structured fields each time",
  },
  {
    current: "Applicants reply across DMs, texts, emails",
    marshalhq: "Applicants gathered in one place, against one shift",
  },
  {
    current: "Decisions made under time pressure with little context",
    marshalhq: "Side-by-side applicant review with relevant experience visible",
  },
  {
    current: "Contact details shared upfront, every time",
    marshalhq: "Contact details released only after acceptance",
  },
  {
    current: "No record of who actually worked",
    marshalhq: "A quiet, factual record builds over completed shifts",
  },
];

export default async function Landing({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  const session = await auth();
  if (session?.user?.id) {
    if (session.user.role === "MANAGER") redirect("/manager");
    if (session.user.role === "MARSHAL") redirect("/marshal");
  }

  const defaultEmail =
    typeof searchParams?.email === "string" ? searchParams.email : "";

  return (
    <div className="mhq-public-home">
      <TopBar />
      <div className="public-main">
        <Hero />
        <ForWhom />
        <Loop />
        <Why />
        <Waitlist defaultEmail={defaultEmail} />
      </div>
      <Footer />
    </div>
  );
}

function MarshalMark({
  size = 28,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="0" y="0" width="32" height="32" rx="6" fill={color} />
      <path
        d="M8 12 L16 18 L24 12"
        stroke="#faf7f1"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
      />
      <rect x="8" y="22" width="16" height="2" fill="#faf7f1" />
    </svg>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div className="container topbar__row">
        <a className="brand" href="#top" aria-label="MarshalHQ">
          <MarshalMark />
          <span className="brand__name">MarshalHQ</span>
        </a>
        <div className="topbar__meta">
          <span className="mono tag">
            REF&nbsp;<b>MHQ-2026-W1</b>
          </span>
          <span className="dot" aria-hidden="true" />
          <span className="mono">Pre-launch &middot; United Kingdom</span>
        </div>
        <a className="topbar__cta" href="#waitlist">
          Join waitlist &rarr;
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="hero">
      <div className="container hero__grid">
        <div className="hero__lede">
          <div className="kicker mono">
            <span className="kicker__dot" />
            UK FILM &amp; TV &middot; LOCATION MARSHAL HIRING
          </div>
          <h1 className="display">
            A clearer way to hire <em>location marshals</em> across UK film and
            TV production.
          </h1>
          <p className="lede">
            Post a structured shift. Review applicants in one place. Choose
            with confidence &mdash; without trawling WhatsApp groups, forwarded
            emails, and word-of-mouth chains.
          </p>
          <form className="hero__form" action="/#waitlist">
            <label className="hero__field">
              <span className="visually-hidden">Email address</span>
              <input
                type="email"
                required
                name="email"
                placeholder="you@production.co.uk"
                autoComplete="email"
              />
            </label>
            <button className="btn btn--primary" type="submit">
              Join the waitlist
              <span className="btn__arrow" aria-hidden="true">
                &rarr;
              </span>
            </button>
          </form>
          <p className="hero__fineprint mono">
            Two questions. About thirty seconds. We won&apos;t share your details.
          </p>
        </div>

        <aside className="hero__side">
          <ShiftCard />
        </aside>
      </div>
    </section>
  );
}

function ShiftCard() {
  return (
    <article className="shiftcard" aria-label="Example shift posting">
      <header className="shiftcard__hd">
        <span className="mono shiftcard__id">SHIFT &middot; LDN-0418-A</span>
        <span className="shiftcard__status">
          <span className="status-dot" /> Open &middot; 4 applicants
        </span>
      </header>

      <div className="shiftcard__body">
        <div className="shiftcard__title">
          <h3>Night marshal &mdash; exterior unit</h3>
          <p className="mono">
            Feature &middot; Episodic block 2 &middot; Two-night booking
          </p>
        </div>

        <dl className="shiftcard__dl">
          <div>
            <dt>Dates</dt>
            <dd>Thu 23 &mdash; Fri 24 Apr</dd>
          </div>
          <div>
            <dt>Call</dt>
            <dd>17:30</dd>
          </div>
          <div>
            <dt>Wrap</dt>
            <dd>04:00 (est.)</dd>
          </div>
          <div>
            <dt>Base</dt>
            <dd>Hackney Wick, E9</dd>
          </div>
          <div>
            <dt>Unit</dt>
            <dd>Exterior &mdash; public right of way</dd>
          </div>
          <div>
            <dt>Posted by</dt>
            <dd>L. Ahmed &middot; Loc. Manager</dd>
          </div>
        </dl>

        <div className="shiftcard__notes">
          <span className="mono notes-label">Notes</span>
          <p>
            Hi-vis essential. Two crossings to hold during principal
            photography. Confident communication with public expected. Previous
            night-unit experience preferred.
          </p>
        </div>
      </div>

      <footer className="shiftcard__ft">
        <span className="mono">Contact details released after acceptance</span>
        <button className="btn btn--ghost btn--sm" type="button" disabled>
          Apply (preview)
        </button>
      </footer>
    </article>
  );
}

function ForWhom() {
  return (
    <section className="section" id="who">
      <div className="container">
        <SectionHead num="01" label="WHO IT'S FOR" />
        <div className="forwhom">
          <article className="audience">
            <div className="audience__hd">
              <span className="mono audience__role">A &middot; Hiring side</span>
              <h3>Location managers &amp; production-side decision-makers</h3>
            </div>
            <p>
              You need a quicker, clearer way to post marshal shifts, see who
              is actually available, and choose someone you can stand behind
              &mdash; under real production pressure.
            </p>
            <ul className="ticks">
              <li>Post a structured shift in under a minute.</li>
              <li>See every applicant for that shift in one place.</li>
              <li>Accept one marshal. Contact details release after acceptance.</li>
              <li>Keep a running record of who has worked with you before.</li>
            </ul>
          </article>

          <article className="audience">
            <div className="audience__hd">
              <span className="mono audience__role">B &middot; Working side</span>
              <h3>Working location marshals</h3>
            </div>
            <p>
              You need a professional way to find real shifts, present relevant
              experience clearly, and start building credibility through
              completed work &mdash; not group-chat reputation.
            </p>
            <ul className="ticks">
              <li>See live shifts that match your region and availability.</li>
              <li>Apply once, properly. No re-typing for every chat.</li>
              <li>Build a quiet record of completed shifts over time.</li>
              <li>Keep your contact details private until a manager accepts you.</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function Loop() {
  return (
    <section className="section section--alt" id="loop">
      <div className="container">
        <SectionHead
          num="02"
          label="THE LOOP"
          title="How marshal hiring runs through MarshalHQ"
        />
        <ol className="loop">
          {loopSteps.map((step, index) => (
            <li className="loop__step" key={step.number}>
              <div className="loop__num mono">{step.number}</div>
              <div className="loop__body">
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </div>
              {index < loopSteps.length - 1 && (
                <div className="loop__rule" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
        <p className="loop__foot mono">
          That is the whole product. No payments, no payroll, no in-app chat,
          no public ratings.
        </p>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className="section" id="why">
      <div className="container">
        <SectionHead
          num="03"
          label="WHY IT EXISTS"
          title="Marshal hiring works. It is just messier than it needs to be."
        />
        <p className="why__lede">
          Most location marshal hiring still happens through WhatsApp groups,
          forwarded messages, and word of mouth. It works, but it is hard to
          compare applicants, hard to keep a record, and hard to keep contact
          details where they belong until someone is actually booked.
        </p>

        <div
          className="compare"
          role="table"
          aria-label="Current methods compared with MarshalHQ"
        >
          <div className="compare__hd" role="row">
            <div className="mono" role="columnheader">
              Today, in most cases
            </div>
            <div className="mono" role="columnheader">
              With MarshalHQ
            </div>
          </div>
          {comparisonRows.map((row) => (
            <div className="compare__row" role="row" key={row.current}>
              <div className="compare__cell compare__cell--now" role="cell">
                {row.current}
              </div>
              <div className="compare__cell compare__cell--mhq" role="cell">
                {row.marshalhq}
              </div>
            </div>
          ))}
        </div>

        <p className="why__note">
          We are not anti-WhatsApp. We just think the same job can run with a
          bit more structure - clearer briefs in, clearer applicants out, and a
          record at the end.
        </p>
      </div>
    </section>
  );
}

function SectionHead({
  num,
  label,
  title,
}: {
  num: string;
  label: string;
  title?: string;
}) {
  return (
    <div className="sectionhead">
      <span className="mono sectionhead__num">&sect; {num}</span>
      <span className="mono sectionhead__label">{label}</span>
      {title && <h2 className="sectionhead__title">{title}</h2>}
    </div>
  );
}

function Waitlist({ defaultEmail }: { defaultEmail: string }) {
  return (
    <section id="waitlist" className="section section--form">
      <div className="container container--narrow">
        <SectionHead
          num="04"
          label="JOIN THE WAITLIST"
          title="Two questions. About thirty seconds."
        />
        <p className="form__lede">
          Tell us who you are and how you hire &mdash; or how you work. We&apos;ll get in
          touch when MarshalHQ opens to your side of the loop.
        </p>

        <EarlyAccessForm defaultEmail={defaultEmail} />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <div className="footer__brand">
          <MarshalMark size={22} />
          <span>MarshalHQ</span>
        </div>
        <nav className="footer__nav">
          <a href="#who">Who it&apos;s for</a>
          <a href="#loop">The loop</a>
          <a href="#why">Why it exists</a>
          <a href="#waitlist">Waitlist</a>
        </nav>
        <div className="footer__legal mono">
          <span>&copy; 2026 MarshalHQ Ltd</span>
          <span className="footer__sep">&middot;</span>
          <Link href="/privacy">Privacy</Link>
          <span className="footer__sep">&middot;</span>
          <Link href="/terms">Terms</Link>
          <span className="footer__sep">&middot;</span>
          <Link href="/support">Contact</Link>
        </div>
      </div>
      <div className="container footer__strip mono">
        <span>UK &middot; Film &amp; Television &middot; Location marshal hiring</span>
        <span>Built with production teams, not for them.</span>
      </div>
    </footer>
  );
}
