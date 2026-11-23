import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Alert, Button, Card, PageHeader } from "@/components/ui";
import { resendVerificationAction } from "@/app/actions/verification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { delivery?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerifiedAt: true, role: true },
  });
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="Email verified"
          subtitle="Your email is verified. Refresh your session to continue."
        />
        <Card>
          <Alert tone="success">
            This account is verified. Continue to log in again so this device
            picks up the updated account state.
          </Alert>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login?verified=1" });
            }}
            className="mt-4"
          >
            <Button type="submit">Continue to login</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Verify your email"
        subtitle="Verify your account email. Pilot shifts are available to invited participants."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Use the verification link for <strong>{user.email}</strong>, then select
          “Verify email address”.
        </p>
        {searchParams.delivery === "sent" && (
          <div className="mt-3">
            <Alert tone="success">Verification email sent. Check your inbox and junk folder.</Alert>
          </div>
        )}
        {searchParams.delivery === "failed" && (
          <div className="mt-3">
            <Alert tone="warn">
              We couldn’t send your verification email. If you already have a working link,
              you can still use it. Try again below or <Link href="/support" className="underline">contact support</Link>.
            </Alert>
          </div>
        )}
        <form action={resendVerificationAction} className="mt-4">
          <Button type="submit" variant="secondary">
            Resend verification email
          </Button>
        </form>
      </Card>
    </div>
  );
}
