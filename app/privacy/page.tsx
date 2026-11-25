import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import ReviewNotice, { showPrivacyReview } from "./ReviewNotice";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  if (showPrivacyReview()) {
    return <div className="mx-auto max-w-3xl"><PageHeader title="Privacy" /><ReviewNotice /></div>;
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Privacy" />
      <div className="prose-plain max-w-none text-[15px]">
        <p>Samuel Blake operates Setru and is the controller of the information described here. Use <Link href="/support">Support</Link> to contact him about your information. This notice covers the public demo, existing accounts and waitlist entries, and support requests. New registrations and waitlist entries are paused.</p>
        <h2>Public demo and browser storage</h2>
        <p>The <Link href="/demo">demo</Link> uses sample people and shifts. It saves your choices in this browser tab’s session storage so you can move between screens. Use Reset demo to start again. You can explore without an account.</p>
        <p>Setru uses first-party cookies to protect sign-in requests, remember the page to return to and keep you signed in. The security and return-page cookies last for the browser session. Clearing cookies can sign you out.</p>
        <h2>Existing waitlist entries</h2>
        <p>The waitlist form asked for your name, email and role, plus optional information such as your production, region or a note. The latest form offered a receipt and one update when places open for your role. To leave or ask what information we hold, use <Link href="/support">Support</Link>.</p>
        <h2>Accounts and booking records</h2>
        <p>Setru uses your email, role, password hash and verification records to run your account. A profile can include self-reported experience, availability and travel details. Applying shares your name, relevant profile and cover note with the manager. Their email notification can include your name.</p>
        <p>Each acceptance gives the posting manager and that marshal access to each other’s booking email and optional phone number. This can happen while places remain open. Those contacts can remain visible after completion. Setru also records decisions, individual call dates worked and eligible reviews. Ask Support if an entry is wrong.</p>
        <h2 id="support">Support, complaints and privacy requests</h2>
        <p>Setru uses your email, optional name, category and message to investigate and reply. Signed-in requests also link to your account. The operator can see the request and record notes. Setru attempts to send a receipt to you and may alert the operator by email. Please leave out ID documents and unrelated information about other people.</p>
        <h2>Why we use this information</h2>
        <p>We use account and booking information to provide the service you request under our terms. We rely on our legitimate interests in keeping accounts secure, responding to ordinary support requests and resolving disputed records. We use information to meet our legal duties when handling data rights requests. We keep restricted case details separate from work history.</p>
        <p>We use the details you gave the waitlist for the request you made. We will check what you agreed to before sending an invitation or update. You can withdraw your request through Support. We do not use joining the list as permission for general marketing.</p>
        <h2>Service providers</h2>
        <p>Vercel hosts the website, Supabase hosts the database and Resend delivers service emails. Hosting and email services may process information outside the UK. Setru also uses security records to limit repeated requests.</p>
        <h2>How long records last</h2>
        <p>A password reset link expires after one hour and an email verification link after 24 hours. Link expiry does not delete the account. Completing a booking does not automatically remove the record or its contacts. You can ask about a particular record or request its removal through Support.</p>
        <h2>Your rights</h2>
        <p>You can request a copy, correction, deletion or restriction of your information. You can also ask for a portable copy where the right applies. Booking records can concern more than one person, so deletion requests need individual review.</p>
        <p><strong>Your right to object.</strong> You can object to processing based on legitimate interests and to direct marketing. Where processing depends on your consent, you can withdraw it.</p>
        <p>Use <Link href="/support">Support</Link> while signed in or signed out to exercise a right, challenge an outcome or complain about how Setru handles your information. You can also <a href="https://ico.org.uk/make-a-complaint/">complain to the UK data protection regulator, the ICO</a>.</p>
      </div>
    </div>
  );
}
