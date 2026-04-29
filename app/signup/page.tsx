import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Sign up"
        subtitle="MarshalHQ is currently running as a controlled private pilot. Account creation requires a valid founder-issued pilot code."
      />
      <p className="mb-4 text-sm text-ink-muted">
        Part of the private pilot? Sign up with your founder-issued code below.
        Not part of the pilot?{" "}
        <Link href="/early-access" className="text-accent underline">
          Join the waitlist
        </Link>
        .
      </p>
      <Card>
        <SignupForm />
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
