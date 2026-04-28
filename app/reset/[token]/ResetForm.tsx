"use client";

import { useFormState, useFormStatus } from "react-dom";
import { completePasswordResetAction } from "@/app/actions/recovery";
import { Alert, Button, Field } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving\u2026" : "Set new password"}
    </Button>
  );
}

export default function ResetForm({ token }: { token: string }) {
  const [state, action] = useFormState(completePasswordResetAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" hint="At least 8 characters">
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <Submit />
    </form>
  );
}
