import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui";

export default function ForgotSentPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Check your inbox" />
      <Card>
        <Alert tone="info">
          If the address belongs to a password account, check your inbox for a reset link. The link expires in one hour.
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
    <p className="mt-4 text-sm"><a href="/login/founder" className="underline">Founder sign-in by email code</a></p>
    </div>
  );
}
