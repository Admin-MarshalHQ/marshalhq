"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field } from "@/components/ui";
import { submitReviewAction } from "@/app/actions/reviews";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Submit review"}
    </Button>
  );
}

function StarInput({ label }: { label: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border border-line-control text-lg text-ink-muted hover:bg-coral-soft has-[:checked]:border-coral-action has-[:checked]:bg-coral-soft has-[:checked]:text-coral-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-ink"
          >
            <input type="radio" name="rating" value={n} required className="sr-only" />
            <span aria-hidden="true">{n}</span>
            <span className="sr-only">{n} {n === 1 ? "star" : "stars"} out of 5</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ReviewForm({
  shiftId,
  subjectLabel,
  marshalId,
  subjects,
}: {
  shiftId: string;
  subjectLabel: string;
  /** Manager reviews name their subject explicitly; omitted for marshal-side
   *  reviews (the subject is always the shift's manager). */
  marshalId?: string;
  /** Multi-marshal shifts: the manager picks an eligible marshal for this review. */
  subjects?: { id: string; label: string }[];
}) {
  const [state, action] = useFormState(submitReviewAction, null);
  const hasChoice = subjects && subjects.length > 1;
  return (
    <form action={action} className="mt-2 space-y-3">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="shiftId" value={shiftId} />
      {marshalId && !hasChoice && (
        <input type="hidden" name="marshalId" value={marshalId} />
      )}
      {hasChoice && (
        <Field
          label="Which marshal is this review about?"
          hint="One review per person for this booking"
        >
          <select name="marshalId" required defaultValue="">
            <option value="" disabled>
              Choose a booked marshal
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <StarInput label={hasChoice ? "Your rating" : `Your rating of ${subjectLabel}`} />
      <Field label="Comment (optional)" hint="Describe your own experience. Report private concerns through Support.">
        <textarea
          name="comment"
          maxLength={1000}
          placeholder="Reliable, on time, easy to work with."
        />
      </Field>
      <Submit />
    </form>
  );
}
