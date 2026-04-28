import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui";

export default function ForgotSentPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Check your inbox" />
      <Card>
        <Alert tone="info">
          If there is a MarshalHQ account linked to that email, we have sent a
          reset link. It expires in 1 hour and can only be used once.
        </Alert>
        <p className="mt-3 text-sm text-ink-muted">
          Nothing arriving? Check the spam folder, or{" "}
          <Link href="/support" className="text-accent underline">
            contact support
          </Link>
          .
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          <Link href="/login" className="text-accent underline">
            Back to log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
