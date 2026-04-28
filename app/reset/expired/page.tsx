import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui";

export default function ResetExpiredPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Reset link no longer works" />
      <Card>
        <Alert tone="warn">
          This password reset link has expired or has already been used. Reset
          links are single-use and expire after 1 hour.
        </Alert>
        <p className="mt-3 text-sm text-ink-muted">
          Request a fresh link and try again.
        </p>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href="/forgot" className="text-accent underline">
            Request a new reset link
          </Link>
          <Link href="/login" className="text-accent underline">
            Back to log in
          </Link>
        </div>
      </Card>
    </div>
  );
}
