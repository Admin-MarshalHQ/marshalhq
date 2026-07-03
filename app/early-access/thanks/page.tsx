import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Waitlist request received - MarshalHQ",
  description: "Your MarshalHQ waitlist request has been received.",
};

export default function EarlyAccessThanksPage() {
  return (
    <div className="mhq-public-home">
      <header className="topbar">
        <div className="container topbar__row">
          <Link className="brand" href="/" aria-label="MarshalHQ home">
            <BrandLogo className="brand__logo" priority alt="" />
          </Link>
          <div className="topbar__meta">
            <span className="mono tag">
              REF&nbsp;<b>MHQ-2026-W1</b>
            </span>
            <span className="dot" aria-hidden="true" />
            <span className="mono">Pre-launch &middot; United Kingdom</span>
          </div>
          <Link className="topbar__cta" href="/#waitlist">
            Back to waitlist
          </Link>
        </div>
      </header>

      <section className="section section--form">
        <div className="container container--narrow">
          <div className="confirm">
            <div className="confirm__stamp mono">
              <span>RECEIVED</span>
              <span className="confirm__ref">REF &middot; MHQ/WAITLIST</span>
            </div>
            <h1>Thanks. You&apos;re on the list.</h1>
            <p>
              Your request has created a waitlist entry only, not a MarshalHQ
              account. We&apos;ll be in touch when MarshalHQ opens to the right
              side of the loop for you.
            </p>
            <dl className="confirm__dl">
              <div>
                <dt>Status</dt>
                <dd>Received for manual review</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>Not created</dd>
              </div>
              <div>
                <dt>Updates</dt>
                <dd>Confirmation and launch access only</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>Private until we contact you</dd>
              </div>
            </dl>
            <div className="confirm__actions">
              <Link className="btn btn--primary" href="/">
                Back to home
                <span className="btn__arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
              <Link className="confirm__link" href="/privacy">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__row">
          <div className="footer__brand">
            <BrandLogo className="footer__logo" alt="MarshalHQ" />
          </div>
          <nav className="footer__nav">
            <Link href="/#who">Who it&apos;s for</Link>
            <Link href="/#loop">The loop</Link>
            <Link href="/#why">Why it exists</Link>
            <Link href="/#waitlist">Waitlist</Link>
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
      </footer>
    </div>
  );
}
