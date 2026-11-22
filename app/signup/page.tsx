import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import SignupForm from "./SignupForm";

import { isSignupOpen } from "@/lib/signup-window";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const open = isSignupOpen();
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        kicker="MarshalHQ · private pilot"
        title="Sign up"
        subtitle={open ? "Manager and marshal signup is open during testing." : "Account creation needs a founder-issued pilot code. Not part of the pilot yet? Join the waitlist below."}
      />
      <Card>
        <SignupForm requiresCode={!open} />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline">
          Log in
        </Link>
        {" · "}
        Not in the pilot?{" "}
        <Link href="/#waitlist" className="text-accent underline">
          Join the waitlist
        </Link>
      </p>
    </div>
  );
}
