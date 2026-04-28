import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Privacy" />
      <div className="prose-plain max-w-none text-[15px]">
        <p>
          MarshalHQ collects only the information required to run a credible
          staffing workflow.
        </p>
        <p>
          <strong>What we store.</strong> Email, phone, password hash, role,
          and the profile or shift content you enter. We also store a record
          of each shift application and its outcome so the reliability signal
          reflects real work history.
        </p>
        <p>
          <strong>Contact details.</strong> Phone numbers and email addresses
          are never visible on public listings or browseable profiles. They
          are released only between a manager and a marshal at the moment a
          booking is confirmed. Contact details are not included in email
          notifications &mdash; they stay inside the accepted booking view.
        </p>
        <p>
          <strong>Account deletion and privacy requests.</strong> Deletion is
          not self-service. Submit a request via{" "}
          <Link href="/support" className="underline">
            support
          </Link>{" "}
          with the &ldquo;Privacy or account deletion request&rdquo; category
          and a human will review it. We handle these manually so that shift,
          application, completion, and trust history stays intact for the
          people you have worked with, and remove what we safely can. We will
          get back to you within a few working days.
        </p>
        <p>
          <strong>Retention.</strong> We retain minimal records of completed
          shifts so the reliability signal remains honest. Draft shifts,
          unresolved applications, and profile content can be removed on
          request.
        </p>
        <p>
          <strong>Support and access.</strong> For account access issues,
          privacy requests, trust or safety concerns, or anything else, use
          our{" "}
          <Link href="/support" className="underline">
            support route
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
