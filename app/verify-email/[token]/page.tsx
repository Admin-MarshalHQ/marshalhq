import Link from "next/link";
import { Alert, ButtonLink, Card, PageHeader } from "@/components/ui";
import { verifyEmailToken } from "@/app/actions/verification";

export default async function VerifyEmailTokenPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await verifyEmailToken(params.token);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Email verification" />
      <Card>
        {result.ok ? (
          <div className="space-y-4">
            <Alert tone="success">
              Your email has been verified. Log in again to refresh your
              session and continue.
            </Alert>
            <ButtonLink href="/login?verified=1">Continue to login</ButtonLink>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert tone="warn">
              This verification link is invalid, expired, or has already been
              used.
            </Alert>
            <p className="text-sm text-ink-muted">
              If you are signed in, return to{" "}
              <Link href="/verify-email" className="underline">
                email verification
              </Link>{" "}
              to request a fresh link.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
