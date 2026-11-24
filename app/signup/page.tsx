import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({searchParams}: {searchParams: {role?: string}}) {
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
