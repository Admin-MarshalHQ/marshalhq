"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field } from "@/components/ui";
import type { Shift } from "@prisma/client";
import type { ShiftActionState } from "@/app/actions/shifts";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving\u2026" : label}
    </Button>
  );
}

type Action = (
  prev: ShiftActionState,
  fd: FormData,
) => Promise<ShiftActionState>;

export default function ShiftForm({
  action,
  shift,
  submitLabel,
}: {
  action: Action;
  shift?: Pick<
    Shift,
    | "productionName"
    | "location"
    | "date"
    | "startTime"
    | "endTime"
    | "rate"
    | "rateUnit"
    | "duties"
    | "parkingTravel"
    | "experienceNotes"
  >;
  submitLabel: string;
}) {
  const [state, a] = useFormState(action, null);
  const dateValue = shift?.date
    ? new Date(shift.date).toISOString().slice(0, 10)
    : "";

  return (
    <form action={a} className="space-y-5">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Field
        label="Production or project name"
        error={state?.fieldErrors?.productionName}
      >
        <input
          name="productionName"
          required
          defaultValue={shift?.productionName ?? ""}
          placeholder="E.g. Untitled BBC pilot"
        />
      </Field>
      <Field label="Location" error={state?.fieldErrors?.location}>
        <input
          name="location"
          required
          defaultValue={shift?.location ?? ""}
          placeholder="Street, town or postcode"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" error={state?.fieldErrors?.date}>
          <input type="date" name="date" required defaultValue={dateValue} />
        </Field>
        <Field label="Start" error={state?.fieldErrors?.startTime}>
          <input
            type="time"
            name="startTime"
            required
            defaultValue={shift?.startTime ?? "07:00"}
          />
        </Field>
        <Field label="End" error={state?.fieldErrors?.endTime}>
          <input
            type="time"
            name="endTime"
            required
            defaultValue={shift?.endTime ?? "19:00"}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Rate" error={state?.fieldErrors?.rate}>
          <input
            type="number"
            name="rate"
            step="0.01"
            min="0"
            required
            defaultValue={shift?.rate ?? ""}
            placeholder="15"
          />
        </Field>
        <Field label="Rate unit" error={state?.fieldErrors?.rateUnit}>
          <select
            name="rateUnit"
            defaultValue={shift?.rateUnit ?? "HOUR"}
            required
          >
            <option value="HOUR">Per hour</option>
            <option value="DAY">Per day</option>
          </select>
        </Field>
      </div>
      <Field
        label="Duties"
        hint="What the marshal will be doing on the day"
        error={state?.fieldErrors?.duties}
      >
        <textarea
          name="duties"
          required
          defaultValue={shift?.duties ?? ""}
          placeholder="Holding traffic at unit base and maintaining a clear path for cast and crew."
        />
      </Field>
      <Field
        label="Parking or travel details"
        hint="Optional"
        error={state?.fieldErrors?.parkingTravel}
      >
        <input
          name="parkingTravel"
          defaultValue={shift?.parkingTravel ?? ""}
          placeholder="Free parking at unit base"
        />
      </Field>
      <Field
        label="Required experience or notes"
        hint="Optional"
        error={state?.fieldErrors?.experienceNotes}
      >
        <textarea
          name="experienceNotes"
          defaultValue={shift?.experienceNotes ?? ""}
          placeholder="Prior traffic management ticket preferred"
        />
      </Field>
      <div className="flex items-center gap-2">
        <Submit label={submitLabel} />
        <span className="text-xs text-ink-soft">
          Saves as a draft. You publish in the next step.
        </span>
      </div>
    </form>
  );
}
