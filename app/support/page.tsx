import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import SupportForm from "./SupportForm";

export default async function SupportPage() {
  const session = await auth();
  const loggedInEmail = session?.user?.email ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Contact MarshalHQ"
        subtitle="Account help, shift or booking issues, privacy or deletion requests, and trust or safety concerns."
      />
      <Card>
        <p className="mb-4 text-sm text-ink-muted">
          A human reviews every request. Privacy and account deletion requests
          are handled manually to keep the shift, application, and completion
          history intact for the people you&rsquo;ve worked with.
        </p>
        <SupportForm loggedInEmail={loggedInEmail} />
      </Card>
      <p className="mt-4 text-xs text-ink-soft">
        See{" "}
        <Link href="/privacy" className="underline">
          how we handle privacy and deletion requests
        </Link>
        .
      </p>
    </div>
  );
}
