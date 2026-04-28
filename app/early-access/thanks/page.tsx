import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui";

export default function EarlyAccessThanksPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Interest registered" />
      <Card>
        <Alert tone="success">
          Thanks, your interest has been registered. MarshalHQ is opening
          carefully during private beta, so access will be reviewed manually.
        </Alert>
        <p className="mt-3 text-sm text-ink-muted">
          <Link href="/" className="text-accent underline">
            Back to home
          </Link>
        </p>
      </Card>
    </div>
  );
}
