import Link from "next/link";
import { Alert, Button, Card, Field, PageHeader } from "@/components/ui";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Create your MarshalHQ account"
        subtitle="One account. You pick your role next."
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
