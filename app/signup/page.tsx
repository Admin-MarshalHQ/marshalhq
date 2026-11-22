import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        kicker="MarshalHQ"
        title="Sign up"
        subtitle="Create a production manager or location marshal account."
      />
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
