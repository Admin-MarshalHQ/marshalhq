import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon, type IconName } from "@/components/Icon";
import { ButtonLink } from "@/components/ui";
import { WAITLIST_NEXT_STEP } from "@/lib/copy";
import EarlyAccessForm from "./early-access/EarlyAccessForm";

export const metadata: Metadata = {
  title: "MarshalHQ – Location marshal hiring for UK film and TV",
  description:
    "Post clear shifts, compare location marshal applicants and share contact details after acceptance. Built for UK film and TV.",
};

const navigation = [
  { href: "#managers", label: "For managers" },
  { href: "#marshals", label: "For marshals" },
  { href: "#loop", label: "How it works" },
  { href: "#why", label: "About" },
];

const benefits: { icon: IconName; title: string; body: string }[] = [
  { icon: "calendar", title: "Post clear shifts", body: "Put the call time, location, rate and duties in one brief." },
  { icon: "people", title: "Compare applicants", body: "See relevant experience, availability and travel range." },
  { icon: "shield", title: "Hire with confidence", body: "Share contact details only after you accept." },
];

const steps = [
  { title: "Post the shift", body: "Set the location, dates, call time, rate and duties so marshals can judge the work." },
  { title: "Receive applications", body: "Working marshals apply with their profile and an optional note." },
  { title: "Review applicants", body: "Compare their availability, experience and practical fit in one place." },
  { title: "Make the booking", body: "Accept one marshal per place, up to the shift’s capacity. Contact details are shared privately between the manager and each accepted marshal." },
  { title: "Complete the shift", body: "Mark the shift complete afterwards to build a factual record of work." },
];

export default async function Landing() {
  const session = await auth();
  if (session?.user?.id) {
    if (session.user.role === "MANAGER") redirect("/manager");
    if (session.user.role === "MARSHAL") redirect("/marshal");
  }

  return (
    <div className="mhq-public-home">
      <header className="marketing-header">
        <div className="marketing-width relative flex min-h-[4.5rem] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <Link href="/" aria-label="MarshalHQ home" className="brand-link">
            <BrandLogo alt="" />
          </Link>
          <nav className="!hidden lg:!flex" aria-label="About MarshalHQ">
            {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Link href="/login" className="shell-link">Log in</Link>
            <ButtonLink href="#waitlist" className="!px-3"><span className="hidden sm:inline">Join the waitlist</span><span className="sm:hidden">Waitlist</span></ButtonLink>
            <details className="mobile-menu lg:hidden">
              <summary className="shell-icon cursor-pointer list-none" aria-label="About MarshalHQ menu">
                <Icon name="menu" />
              </summary>
              <nav aria-label="About MarshalHQ" className="mobile-menu__panel">
                {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
              </nav>
            </details>
          </div>
        </div>
      </header>

      <section className="marketing-hero" aria-labelledby="hero-heading">
        <div className="marketing-width">
          <div className="hero-grid">
            <div className="min-w-0">
              <h1 id="hero-heading" className="hero-title">
                Location marshal shifts for <em>UK film and TV</em>
              </h1>
              <div className="mb-6 mt-5 max-w-[45ch] space-y-2 text-base leading-relaxed text-ink-muted sm:text-lg">
                <p>Location managers can post a clear shift and compare applicants in one place.</p>
                <p>Working marshals can check call times, rates and duties before applying.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="#waitlist">Join the private beta waitlist <Icon name="arrow" className="ml-2 size-4 shrink-0" /></ButtonLink>
                <ButtonLink href="#loop" variant="secondary">See how it works</ButtonLink>
              </div>
            </div>
            <div className="hero-art">
              <ExampleShift />
            </div>
          </div>
          <ul className="grid gap-4 pb-8 sm:grid-cols-3 sm:pb-12">
            {benefits.map(({ icon, title, body }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-coral-soft text-coral-ink"><Icon name={icon} /></span>
                <div><p className="font-bold">{title}</p><p className="mt-0.5 text-sm text-ink-muted">{body}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="who" className="marketing-section">
        <div className="marketing-width">
          <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Who it’s for</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <article id="managers" className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-7">
              <h3 className="text-xl font-bold">Location managers</h3>
              <p className="mt-2 text-ink-muted">Post one clear brief for your production, see who can cover it and keep a record of the people you’ve worked with.</p>
            </article>
            <article id="marshals" className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-7">
              <h3 className="text-xl font-bold">Working location marshals</h3>
              <p className="mt-2 text-ink-muted">See the call time, rate and duties before you apply. Keep your contact details private until you’re accepted and build a record of completed shifts.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="loop" className="marketing-section bg-surface-subtle">
        <div className="marketing-width">
          <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">From call time to completion</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(({ title, body }) => (
              <li key={title} className="rounded-lg border border-line bg-white p-4">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="why" className="marketing-section">
        <div className="marketing-width">
          <h2 className="max-w-[25ch] font-editorial text-3xl font-medium sm:text-[2.625rem]">A clearer alternative to scattered group chats</h2>
          <p className="mt-4 max-w-2xl text-ink-muted">WhatsApp and word of mouth help crews find people quickly. MarshalHQ puts the brief, applications and hiring decision against the same shift, so everyone knows what was agreed.</p>
        </div>
      </section>

      <section id="waitlist" tabIndex={-1} className="marketing-section bg-coral-soft">
        <div className="marketing-width !max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Join the private beta waitlist</h2>
          <p className="mt-2 text-ink-muted">{WAITLIST_NEXT_STEP}</p>
          <EarlyAccessForm />
        </div>
      </section>
    </div>
  );
}

function ExampleShift() {
  return (
    <article className="w-full max-w-md rounded-lg border border-white/80 bg-white p-4 shadow-panel sm:p-6" aria-label="Example shift posting">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-coral-ink">
        <Icon name="clipboard" className="shrink-0" />
        <span>Illustrative example – not a live shift</span>
      </div>
      <p className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">Location marshal · exterior unit</p>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm min-[400px]:grid-cols-2">
        {[
          ["Location", "Hackney Wick, London"],
          ["Example date", "23 April"],
          ["Call to wrap", "07:00–17:00"],
          ["Example rate", "£180 / day"],
        ].map(([label, value]) => (
          <div key={label} className="border-t border-line pt-2">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">Help pedestrians navigate the set perimeter and keep the unit entrance clear.</p>
    </article>
  );
}
