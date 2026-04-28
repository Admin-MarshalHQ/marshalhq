import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui";

export default function SupportThanksPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Request received" />
      <Card>
        <Alert tone="success">
          Thanks — we have your request. A confirmation is on its way to the
          email you gave us.
        </Alert>
        <p className="mt-3 text-sm text-ink-muted">
          A human at MarshalHQ will review it and reply. Privacy and account
          deletion requests are handled manually and may take a few working
          days.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          <Link href="/" className="text-accent underline">
            Back to home
          </Link>
        </p>
      </Card>
    </div>
  );
}
