"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field } from "@/components/ui";
import { addAvailabilityBlockAction } from "@/app/actions/availability";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Add unavailable dates"}
    </Button>
  );
}

export default function AvailabilityForm() {
  const [state, action] = useFormState(addAvailabilityBlockAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" error={state?.fieldErrors?.startDate}>
          <input type="date" name="startDate" required />
        </Field>
        <Field label="To" error={state?.fieldErrors?.endDate}>
          <input type="date" name="endDate" required />
        </Field>
      </div>
      <Field label="Note (optional)" error={state?.fieldErrors?.note}>
        <input name="note" maxLength={200} placeholder="On another booking" />
      </Field>
      <Submit />
    </form>
  );
}
