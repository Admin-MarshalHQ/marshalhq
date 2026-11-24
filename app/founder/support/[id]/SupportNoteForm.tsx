"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateSupportRequestNoteAction } from "@/app/actions/founder";
import { Alert, Button, Field } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving\u2026" : "Save note"}
    </Button>
  );
}

export default function SupportNoteForm({
  requestId,
  initialNote, initialRevision,
}: {
  requestId: string;
  initialNote: string; initialRevision: number;
}) {
  const bound = updateSupportRequestNoteAction.bind(null, requestId);
  const [state, action] = useFormState(bound, null);
  const [note, setNote] = useState(initialNote);
  const [revision, setRevision] = useState(initialRevision);
  useEffect(() => {
    if (state?.savedRevision !== undefined) setRevision(state.savedRevision);
  }, [state]);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="revision" value={revision} />
      {state?.needsLogin && <a className="underline" target="_blank" rel="noopener" href={`/login/founder?next=${encodeURIComponent("/founder/support/" + requestId)}`}>Sign in again in a new tab</a>}
      {state?.conflict && <div>
        <p>Current case: {state.conflict.resolvedAt ? "Handled" : "Open"}</p>
        <p className="whitespace-pre-wrap">Current note: {state.conflict.founderNote || "Empty"}</p>
        {revision !== state.conflict.revision && <button type="button" className="underline" onClick={() => setRevision(state.conflict!.revision)}>Use this revision for my next save</button>}
      </div>}
      {state?.savedRevision !== undefined && <p role="status">Note saved.</p>}
      <Field label="Note">
        <textarea name="note" rows={4} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <Submit />
    </form>
  );
}
