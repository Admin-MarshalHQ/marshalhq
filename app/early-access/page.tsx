import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import EarlyAccessForm from "./EarlyAccessForm";

export default function EarlyAccessPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Join waitlist"
        subtitle="MarshalHQ is opening carefully during private beta. Access is reviewed manually."
      />
      <Card>
        <p className="mb-4 text-sm text-ink-muted">
          For location managers and location marshals working on UK film and
          TV. The product is built around clear shift posting, applicant
          review, acceptance, and controlled contact release. Tell us a little
          about your interest and we&rsquo;ll be in touch as access opens.
        </p>
        <EarlyAccessForm />
      </Card>
      <p className="mt-4 text-xs text-ink-soft">
        See{" "}
        <Link href="/privacy" className="underline">
          how we handle your details
        </Link>
        .
      </p>
    </div>
  );
}
