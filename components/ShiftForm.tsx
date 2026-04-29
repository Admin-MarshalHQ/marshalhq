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
    | "startDate"
    | "endDate"
    | "dailyStartTime"
    | "dailyEndTime"
    | "rate"
    | "rateUnit"
    | "duties"
    | "parkingTravel"
    | "experienceNotes"
  >;
  submitLabel: string;
}) {
  const [state, a] = useFormState(action, null);
  const startDateValue = shift?.startDate
    ? new Date(shift.startDate).toISOString().slice(0, 10)
    : "";
  const endDateValue = shift?.endDate
    ? new Date(shift.endDate).toISOString().slice(0, 10)
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" error={state?.fieldErrors?.startDate}>
          <input
            type="date"
            name="startDate"
            required
            defaultValue={startDateValue}
          />
        </Field>
        <Field
          label="End date"
          hint="Same as start date for a one-day shift"
          error={state?.fieldErrors?.endDate}
        >
          <input
            type="date"
            name="endDate"
            required
            defaultValue={endDateValue}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Daily start time"
          error={state?.fieldErrors?.dailyStartTime}
        >
          <input
            type="time"
            name="dailyStartTime"
            required
            defaultValue={shift?.dailyStartTime ?? "07:00"}
          />
        </Field>
        <Field
          label="Daily end time"
          error={state?.fieldErrors?.dailyEndTime}
        >
          <input
            type="time"
            name="dailyEndTime"
            required
            defaultValue={shift?.dailyEndTime ?? "19:00"}
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
