"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field } from "@/components/ui";
import { applyToShiftAction } from "@/app/actions/hiring";
import {
  APPLY_LIMITED_REMINDER,
  APPLY_UNAVAILABLE_DATES_REMINDER,
} from "@/lib/copy";

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
  unavailableDatesConflict,
}: {
  shiftId: string;
  limitedAvailability?: boolean;
  unavailableDatesConflict?: boolean;
}) {
  const [state, action] = useFormState(applyToShiftAction, null);
  const [noteLen, setNoteLen] = useState(0);
  return (
    <form action={action} className="mt-2 space-y-3">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {limitedAvailability && (
        <Alert tone="warn">{APPLY_LIMITED_REMINDER}</Alert>
      )}
      {unavailableDatesConflict && (
        <Alert tone="warn">{APPLY_UNAVAILABLE_DATES_REMINDER}</Alert>
      )}
      <input type="hidden" name="shiftId" value={shiftId} />
      <Field
        label="Short note (optional)"
        hint="Anything the manager should know"
      >
        <textarea
          name="coverNote"
          maxLength={1000}
          onChange={(e) => setNoteLen(e.target.value.length)}
          placeholder="I can be on site 30 minutes before call."
        />
        {noteLen > 0 && (
          <div className="mt-1 text-right">
            <span className="font-mono text-[11px] text-ink-soft">
              {noteLen}/1000
            </span>
          </div>
        )}
      </Field>
      <Submit />
      <p className="text-xs text-ink-soft">
        By applying you agree to be contacted if the manager accepts you.
      </p>
    </form>
  );
}
