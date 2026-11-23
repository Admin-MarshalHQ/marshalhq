import { Alert, Button, ButtonLink, Card, PageHeader } from "@/components/ui";
import { confirmEmailAction } from "@/app/actions/verification";
import { emailVerificationState } from "@/lib/email-verification";

export default async function VerifyEmailTokenPage({
  params,
}: {
  params: { token: string };
}) {
  const state = await emailVerificationState(params.token);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Email verification" />
      <Card>
        {state === "ready" && (
          <form action={confirmEmailAction.bind(null, params.token)} className="space-y-4">
            <p>Confirm this email address for your Setru account.</p>
            <Button type="submit">Verify email address</Button>
          </form>
        )}
        {state === "verified" && (
          <div className="space-y-4">
            <Alert tone="success">Your email is already verified.</Alert>
            <ButtonLink href="/login?verified=1">Continue to login</ButtonLink>
          </div>
        )}
        {state === "invalid" && (
          <div className="space-y-4">
            <Alert tone="warn">This verification link is invalid or has expired.</Alert>
            <p className="text-sm text-ink-muted">
              Open your latest verification email or sign in to request a fresh link.
            </p>
            <ButtonLink href="/verify-email">Request a fresh link</ButtonLink>
          </div>
        )}
      </Card>
    </div>
  );
}
