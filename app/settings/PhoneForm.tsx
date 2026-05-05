"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveAccountPhoneAction } from "@/app/actions/profile";
import { Alert, Button, Field } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Saving..." : "Save phone"}
    </Button>
  );
}

export default function PhoneForm({ phone }: { phone: string | null }) {
  const [state, action] = useFormState(saveAccountPhoneAction, null);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Phone" hint="Released only after a booking is confirmed">
        <input
          type="tel"
          name="phone"
          defaultValue={phone ?? ""}
          autoComplete="tel"
          placeholder="07911 123456"
        />
      </Field>
      <Submit />
    </form>
  );
}
