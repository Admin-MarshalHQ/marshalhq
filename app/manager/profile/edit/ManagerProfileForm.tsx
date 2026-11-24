"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveManagerProfileAction } from "@/app/actions/profile";
import { Alert, Button, Field } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save profile"}
    </Button>
  );
}

export default function ManagerProfileForm({
  companyName,
  displayName,
}: {
  companyName: string;
  displayName: string;
}) {
  const [state, action] = useFormState(saveManagerProfileAction, null);
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Company or production house" error={state?.fieldErrors?.companyName}>
        <input name="companyName" required defaultValue={companyName} />
      </Field>
      <Field label="Your name" error={state?.fieldErrors?.displayName}>
        <input name="displayName" required defaultValue={displayName} />
      </Field>
      <a href="/settings" className="text-sm underline">Edit your booking phone in Settings</a>
      <Submit />
    </form>
  );
}
