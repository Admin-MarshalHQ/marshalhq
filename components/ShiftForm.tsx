"use client";

import { formatShiftBlock } from "@/lib/format";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field, FormSection } from "@/components/ui";
import type { Shift } from "@prisma/client";
import type { ShiftActionState } from "@/app/actions/shifts";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      className={
        value > max * 0.9
          ? "font-mono text-[11px] text-warn"
          : "font-mono text-[11px] text-ink-soft"
      }
    >
      {value}/{max}
    </span>
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
    | "marshalsNeeded"
    | "rate"
    | "rateUnit"
    | "duties"
    | "engagementTerms"
    | "parkingTravel"
    | "experienceNotes"
  >;
  submitLabel: string;
}) {
  const [state, a] = useFormState(action, null);
  const [dutiesLen, setDutiesLen] = useState(shift?.duties?.length ?? 0);
  const [notesLen, setNotesLen] = useState(
    shift?.experienceNotes?.length ?? 0,
  );
  const startDateValue = shift?.startDate
    ? new Date(shift.startDate).toISOString().slice(0, 10)
    : "";
  const [shootDate, setShootDate] = useState(startDateValue);

  const [lastDate, setLastDate] = useState(shift ? new Date(shift.endDate).toISOString().slice(0, 10) : "");
  const [call, setCall] = useState(shift?.dailyStartTime ?? "07:00");
  const [wrap, setWrap] = useState(shift?.dailyEndTime ?? "19:00");
  return (
    <form action={a} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <FormSection
        title="Production"
        description="Shown to marshals browsing open shifts. Leave contact details out — contact is shared only after you accept an applicant."
      >
        <Field
          label="Production or project name"
          error={state?.fieldErrors?.productionName}
        >
          <input
            name="productionName"
            required
            maxLength={140}
            defaultValue={shift?.productionName ?? ""}
            placeholder="E.g. Untitled BBC pilot"
          />
        </Field>
        <Field label="Location" error={state?.fieldErrors?.location}>
          <input
            name="location"
            required
            maxLength={200}
            defaultValue={shift?.location ?? ""}
            placeholder="Street, town or postcode"
          />
        </Field>
      </FormSection>

      <FormSection title="Schedule" description="Book the same crew for one call or a run of consecutive calls. Hours repeat each day in London time. An earlier wrap time means the following day. When clocks go back, repeated times use the first occurrence.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First call date" error={state?.fieldErrors?.startDate}>
            <input
              type="date"
              name="startDate"
              required
              value={shootDate} onChange={(e) => {
                const next = e.target.value;
                if (!lastDate || lastDate === shootDate || lastDate < next) setLastDate(next);
                setShootDate(next);
              }}
            />
          </Field>
          <Field label="Last call date" hint="Use the first date again for one shift." error={state?.fieldErrors?.endDate}>
            <input type="date" name="endDate" required min={shootDate} value={lastDate} onChange={e => setLastDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Call time"
            error={state?.fieldErrors?.dailyStartTime}
          >
            <input
              type="time"
              name="dailyStartTime"
              required
              value={call} onChange={e => setCall(e.target.value)}
            />
          </Field>
          <Field
            label="Wrap time"
            error={state?.fieldErrors?.dailyEndTime}
          >
            <input
              type="time"
              name="dailyEndTime"
              required
              value={wrap} onChange={e => setWrap(e.target.value)}
            />
          </Field>
        </div>
        {shootDate && lastDate >= shootDate && call && wrap && call !== wrap && (
          <p aria-live="polite" className="text-sm text-ink-muted">{formatShiftBlock(shootDate, lastDate, call, wrap)}</p>
        )}
      </FormSection>

      <FormSection title="Team and pay">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Marshals needed"
            error={state?.fieldErrors?.marshalsNeeded}
          >
            <input
              type="number"
              name="marshalsNeeded"
              min={1}
              step={1}
              required
              defaultValue={shift?.marshalsNeeded ?? 1}
            />
          </Field>
          <Field label="Rate (GBP)" error={state?.fieldErrors?.rate}>
            <input
              type="number"
              name="rate"
              step="0.01"
              min="0.01"
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
      </FormSection>

      <FormSection title="Engagement terms" description="Required before a vacancy can be advertised. These terms are shown to marshals.">
        <Field label="Hirer, pay, safety and cancellation" hint="Give the contracting hirer and type of engagement, hours covered, breaks, overtime, expenses, when and how pay is made, notice or cancellation terms, who supervises, safety risks and precautions. Record any required training or equipment. Keep personal contact details out." error={state?.fieldErrors?.engagementTerms}>
          <textarea name="engagementTerms" maxLength={3000} rows={7} defaultValue={shift?.engagementTerms ?? ""} />
        </Field>
      </FormSection>

      <FormSection
        title="The work"
        description="What a marshal needs to decide whether this shift is right for them."
      >
        <Field
          label="Duties"
          hint="What the marshal will be doing on the day"
          error={state?.fieldErrors?.duties}
        >
          <textarea
            name="duties"
            required
            maxLength={2000}
            defaultValue={shift?.duties ?? ""}
            onChange={(e) => setDutiesLen(e.target.value.length)}
            placeholder="Guiding arrivals to unit base and keeping pedestrian routes clear."
          />
        </Field>
          <div className="mt-1 text-right">
            <Counter value={dutiesLen} max={2000} />
          </div>
        <Field
          label="Parking or travel details"
          hint="Optional"
          error={state?.fieldErrors?.parkingTravel}
        >
          <input
            name="parkingTravel"
            maxLength={500}
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
            maxLength={500}
            defaultValue={shift?.experienceNotes ?? ""}
            onChange={(e) => setNotesLen(e.target.value.length)}
            placeholder="Outdoor location work experience preferred"
          />
        </Field>
          <div className="mt-1 text-right">
            <Counter value={notesLen} max={500} />
          </div>
      </FormSection>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Submit label={submitLabel} />
        <span className="text-xs text-ink-soft">
          Saves as a draft — marshals see nothing until you publish in the
          next step.
        </span>
      </div>
    </form>
  );
}
