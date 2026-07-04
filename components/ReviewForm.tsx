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

/**
 * Star input backed by radio buttons (no client state needed — the checked
 * radio carries the value into the form action). The label glyphs fill on
 * hover/selection via the peer utilities so the control reads as stars.
 */
function StarInput() {
  // Classic fill-up-to pattern: stars render in reverse DOM order (5→1) so that
  // hovering or checking a star can fill itself and all visually-left stars via
  // following-sibling selectors. text-line = empty, gold = filled.
  return (
    <fieldset
      className="flex flex-row-reverse justify-end gap-1"
      aria-label="Rating out of 5"
    >
      {[5, 4, 3, 2, 1].map((n) => (
        <label
          key={n}
          className="cursor-pointer text-2xl leading-none text-line transition-colors hover:text-gold has-[:checked]:text-gold [&:has(:checked)~label]:text-gold [&:hover~label]:text-gold"
          title={`${n} star${n === 1 ? "" : "s"}`}
        >
          <input type="radio" name="rating" value={n} required className="sr-only" />
          <span aria-hidden>★</span>
          <span className="sr-only">
            {n} star{n === 1 ? "" : "s"}
          </span>
        </label>
      ))}
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
  /** Multi-marshal shifts: the manager picks who the single review is about. */
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
          hint="One review per shift for now"
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
      <Field label={hasChoice ? "Your rating" : `Your rating of ${subjectLabel}`}>
        <StarInput />
      </Field>
      <Field label="Comment (optional)" hint="Shared on their profile">
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
