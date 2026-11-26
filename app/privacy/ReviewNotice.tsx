import Link from "next/link";

export function showPrivacyReview(env: NodeJS.ProcessEnv = process.env) {
  return env.SETRU_PRIVACY_REVIEW === "1" &&
    (env.VERCEL_ENV === "preview" || (env.NODE_ENV === "development" && !env.VERCEL_ENV));
}

export default function ReviewNotice() {
  return (
    <div className="prose-plain max-w-none text-[15px]">
      <p role="status"><strong>Draft for review. Not the published privacy notice.</strong></p>
      <p>This notice describes how the Setru website and invited hiring pilot use information.</p>

      <h2 id="waitlist">Waitlist</h2>
      <p>Joining is optional. We ask for your name, email and the role you are interested in. You can also share your company or production, region, and a note. We use these details to understand demand, send a confirmation and send one update when places open for your role. Joining is not permission for unrelated marketing. To leave the waitlist, use <Link href="/support">Support</Link>.</p>

      <h2 id="accounts">Accounts and hiring</h2>
      <p>We use your email, account role, password hash and verification and session records to run and protect your account. You may add a phone number. In the pilot we store profile and shift information, applications and their outcomes, booking records, attendance for the calls you were booked on, and eligible ratings and work history.</p>
      <p>When you apply, the manager receives your name, relevant profile information and your optional cover note in their account. New application alerts direct the manager to sign in. Earlier alerts could include your name. Account email addresses and phone numbers are not shown to the other party at this step. When the manager accepts, the manager and that marshal can see each other’s booking contact details, including email and any phone number provided. Other applicants cannot see those contact details. Booking notifications do not include the other person’s email or phone.</p>
      <p>We use attendance and review information to show work history, handle disputes and correct records. The booking record can remain after completion. Booking contact access ends seven days after the scheduled final wrap, or at the last retained wrap when future calls are released. Withdrawal, cancellation, a pause or a disabled account can end access earlier.</p>

      <h2 id="support">Support and privacy requests</h2>
      <p>If you contact us, we use your email, request category and message to review and respond. If you are signed in, the request can be linked to your account. Authorised staff can make internal notes and keep case or correction records. Please do not include identity documents or other people’s contact details in the form.</p>

      <h2 id="service-providers">Who helps operate the service</h2>
      <p>Setru uses Vercel for website hosting, Supabase for database hosting and Resend for transactional email. Access to a person’s information depends on the service and its purpose. Signing in uses session cookies. The public demo uses sample people and saves demo actions in browser session storage; it does not make real bookings.</p>

      <p>PostHog counts new waitlist entries and, if you enable sharing in the demo, sample applications and bookings. Our server sends a fresh random identifier for each event and excludes your IP address and form details. Untick the demo checkbox to stop sharing.</p>

      <h2 id="your-rights">Your choices and rights</h2>
      <p>You can ask for access to or correction of information about you, or ask for erasure, restriction, portability or to object where those rights apply. Where we rely on consent, you can withdraw it. Use the privacy or account deletion category on <Link href="/support">Support</Link>. Requests are reviewed individually. Deletion is not automatic and may not apply to all records. You can also <a href="https://ico.org.uk/make-a-complaint/">complain to the Information Commissioner’s Office (ICO)</a>.</p>
    </div>
  );
}
