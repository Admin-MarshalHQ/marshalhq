"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { Alert, Button, Field } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Logging in\u2026" : "Log in"}
    </Button>
  );
}

export default function LoginForm({
  next,
  resetSuccess,
}: {
  next: string;
  resetSuccess?: boolean;
}) {
  const [state, action] = useFormState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      {resetSuccess && (
        <Alert tone="success">
          Your password has been updated. Log in with the new password.
        </Alert>
      )}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field label="Email">
        <input type="email" name="email" required autoComplete="email" />
      </Field>
      <Field label="Password">
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </Field>
      <div className="text-right text-xs">
        <Link href="/forgot" className="text-accent underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Submit />
    </form>
  );
}
