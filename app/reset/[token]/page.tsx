import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashResetToken } from "@/lib/reset";
import { Card, PageHeader } from "@/components/ui";
import ResetForm from "./ResetForm";

export default async function ResetPage({
  params,
}: {
  params: { token: string };
}) {
  // Validate the token up-front so we can show the expiry state without
  // exposing any user information (no email, no "user x" messaging).
  const tokenHash = hashResetToken(params.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { usedAt: true, expiresAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    redirect("/reset/expired");
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Set a new password"
        subtitle="Use at least 8 characters. You'll be returned to the login page to sign in with the new password."
      />
      <Card>
        <ResetForm token={params.token} />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        <Link href="/login" className="text-accent underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
