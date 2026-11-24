import { intakeHeld } from "@/lib/intake";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui";
import { Audience, ExampleShift, HiringProcess, WhySetru } from "@/components/landing/HomeSections";
import { WAITLIST_NEXT_STEP } from "@/lib/copy";
import EarlyAccessForm from "./early-access/EarlyAccessForm";
import "./home.css";

const title = "Setru | Location marshal hiring for UK film and TV";
const description =
  "Post clear shifts, compare applicants and share contact details after acceptance. Explore the UK film and TV hiring demo.";
const socialImage = {
  url: "/brand/setru-social.png",
  width: 1200,
  height: 630,
  alt: "Setru. Location marshal hiring for UK film and TV.",
};

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, siteName: "Setru", type: "website", locale: "en_GB", url: "/", images: [socialImage] },
  twitter: { card: "summary_large_image", title, description, images: [socialImage] },
};

const navigation = [
  { href: "#managers", label: "For managers" },
  { href: "#marshals", label: "For marshals" },
  { href: "#loop", label: "How it works" },
  { href: "#why", label: "About" },
];

export default async function Landing() {
  const session = await auth();
  if (session?.user?.id) {
    if (session.user.role === "MANAGER") redirect("/manager");
    if (session.user.role === "MARSHAL") redirect("/marshal");
  }

  return (
    <div className="mhq-public-home">
      <header className="marketing-header" role="banner">
        <div className="marketing-width home-header-inner">
          <Link href="/" aria-label="Setru home" className="brand-link">
            <BrandLogo alt="" />
          </Link>
          <nav aria-label="About Setru" className="home-desktop-nav">
            {navigation.map(({ href, label }) => <a key={href} href={href} className="shell-link">{label}</a>)}
          </nav>
          <div className="home-header-actions">
            <Link href="/login" className="shell-link">Log in</Link>
            <ButtonLink href="/demo" className="home-nav-waitlist">
              <span className="hidden sm:inline">View demo</span>
              <span className="sm:hidden">Demo</span>
            </ButtonLink>
            <details className="home-mobile-menu">
              <summary className="shell-icon list-none" aria-label="About Setru menu">
                <Icon name="menu" />
              </summary>
              <nav aria-label="About Setru" className="home-menu-panel">
                {navigation.map(({ href, label }) => <a key={href} href={href} className="shell-link">{label}</a>)}
              </nav>
            </details>
          </div>
        </div>
      </header>
      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="marketing-width home-hero-grid">
          <div className="min-w-0">
            <p className="home-eyebrow">For UK film and television</p>
            <h1 id="hero-heading" tabIndex={-1}>Location marshal hiring, <em>made clear.</em></h1>
            <p className="home-hero-intro">
              Location managers can post and fill shifts in one place. Marshals see the call time,
              rate and duties before they apply.
            </p>
            <div className="home-hero-actions">
              <ButtonLink href="/demo">
                View demo <Icon name="arrow" className="size-4 shrink-0" />
              </ButtonLink>
              <a href="#waitlist" className="home-text-link">Private beta access</a>
            </div>
          </div>
          <ExampleShift />
        </div>
      </section>

      <Audience />
      <HiringProcess />
      <WhySetru />

      <section id="waitlist" tabIndex={-1} className="home-section border-t border-line bg-coral-soft" aria-labelledby="waitlist-heading">
        <div className="marketing-width !max-w-3xl">
          <h2 id="waitlist-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Private beta access</h2>
          {intakeHeld() ? <p className="mt-2 text-ink-muted">
            New waitlist entries and registrations are paused. If you have already joined, you can
            ask to leave or update your details through <Link className="underline" href="/support">Support</Link>.
          </p> : <><p className="mt-2 text-ink-muted">{WAITLIST_NEXT_STEP}</p><EarlyAccessForm /></>}
        </div>
      </section>
    </div>
  );
}
