"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateShiftNoteAction } from "@/app/actions/founder";
import { Alert, Button, Field } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving\u2026" : "Save note"}
    </Button>
  );
}

export default function ShiftNoteForm({
  shiftId,
  initialNote,
}: {
  shiftId: string;
  initialNote: string;
}) {
  const bound = updateShiftNoteAction.bind(null, shiftId);
  const [state, action] = useFormState(bound, null);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Note">
        <textarea name="note" rows={4} maxLength={1000} defaultValue={initialNote} />
      </Field>
      <Submit />
    </form>
  );
}
