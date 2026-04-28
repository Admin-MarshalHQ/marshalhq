"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field } from "@/components/ui";
import { applyToShiftAction } from "@/app/actions/hiring";
import { APPLY_LIMITED_REMINDER } from "@/lib/copy";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Submitting\u2026" : "Apply to this shift"}
    </Button>
  );
}

export default function ApplyForm({
  shiftId,
  limitedAvailability,
}: {
  shiftId: string;
  limitedAvailability?: boolean;
}) {
  const [state, action] = useFormState(applyToShiftAction, null);
  return (
    <form action={action} className="mt-2 space-y-3">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {limitedAvailability && (
        <Alert tone="warn">{APPLY_LIMITED_REMINDER}</Alert>
      )}
      <input type="hidden" name="shiftId" value={shiftId} />
      <Field
        label="Short note (optional)"
        hint="Anything the manager should know"
      >
        <textarea
          name="coverNote"
          maxLength={1000}
          placeholder="I can be on site 30 minutes before call."
        />
      </Field>
      <Submit />
      <p className="text-xs text-ink-soft">
        By applying you agree to be contacted if the manager accepts you.
      </p>
    </form>
  );
}
