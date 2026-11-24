import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui";

export default function SupportThanksPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Request received" />
      <Card>
        <Alert tone="success">
          We’ve received your request.
        </Alert>
        <p className="mt-3 text-sm text-ink-muted">
          Setru will review your request and use the email address you supplied to follow up.
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
