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
    <Button type="submit" disabled={pending} className="min-h-12 w-full">
      {pending ? "Submitting\u2026" : "Apply for this shift"}
    </Button>
  );
}

export default function ApplyForm({
  shiftId, briefVersion, noticeVersion,
  limitedAvailability,
  unavailableDatesConflict,
}: {
  shiftId: string; briefVersion: string; noticeVersion: string;
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
      <input type="hidden" name="briefVersion" value={briefVersion} />
      <input type="hidden" name="noticeVersion" value={noticeVersion} />
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
      </Field>
      {noteLen > 0 && (
          <div className="mt-1 text-right">
            <span className="font-mono text-[11px] text-ink-soft">
              {noteLen}/1000
            </span>
          </div>
      )}
      <p className="text-xs text-ink-soft">
        By applying, you confirm you are available for every advertised call, including the final wrap. The manager sees your named profile and note in Setru when you apply. Their email alert asks them to sign in to review it. If booked, you each receive access to the other’s booking contact details.
      </p>
      <Submit />
    </form>
  );
}
