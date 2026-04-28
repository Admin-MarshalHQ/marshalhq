"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordResetAction } from "@/app/actions/recovery";
import { Button, Field } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending\u2026" : "Send reset link"}
    </Button>
  );
}

export default function ForgotForm() {
  const [, action] = useFormState(requestPasswordResetAction, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </Field>
      <Submit />
    </form>
  );
}
