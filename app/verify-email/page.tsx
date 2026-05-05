import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Alert, Button, Card, PageHeader } from "@/components/ui";
import { resendVerificationAction } from "@/app/actions/verification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { resent?: string };
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
        subtitle="MarshalHQ is still a private pilot. Verify your email before using the product."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          We sent a verification link to <strong>{user.email}</strong>. Open
          the link in that email to activate your account.
        </p>
        {searchParams.resent === "1" && (
          <div className="mt-3">
            <Alert tone="success">
              If the address is still active, a fresh verification email has
              been sent.
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
