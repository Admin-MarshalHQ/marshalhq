import { intakeHeld } from "@/lib/intake";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({searchParams}: {searchParams: {role?: string}}) {
  if (intakeHeld()) {
    return <div className="mx-auto max-w-md">
      <PageHeader title="Registration is paused" subtitle="Explore Setru with sample shifts and profiles. No account is needed." />
      <Card><Link className="underline" href="/demo">View demo</Link> · <Link className="underline" href="/login">Log in to an existing account</Link></Card>
    </div>;
  }
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        kicker="Setru"
        title="Sign up"
        subtitle="Register as a manager or marshal. Invited participants can access pilot shifts after verifying their email."
      />
      <Card>
        <SignupForm initialRole={searchParams.role === "MANAGER" || searchParams.role === "MARSHAL" ? searchParams.role : null} />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
