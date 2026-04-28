"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field } from "@/components/ui";
import type { MarshalProfile } from "@prisma/client";
import { saveMarshalProfileAction } from "@/app/actions/profile";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving\u2026" : label}
    </Button>
  );
}

function boolDefault(v: boolean | null | undefined) {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
}

export default function MarshalProfileForm({
  profile,
}: {
  profile: MarshalProfile | null;
}) {
  const [state, action] = useFormState(saveMarshalProfileAction, null);
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <Field label="Full name" error={state?.fieldErrors?.fullName}>
        <input
          name="fullName"
          required
          defaultValue={profile?.fullName ?? ""}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Base location"
          error={state?.fieldErrors?.baseLocation}
        >
          <input
            name="baseLocation"
            required
            defaultValue={profile?.baseLocation ?? ""}
            placeholder="Town or postcode"
          />
        </Field>
        <Field
          label="Travel radius (miles)"
          error={state?.fieldErrors?.travelRadiusMiles}
        >
          <input
            type="number"
            name="travelRadiusMiles"
            min={0}
            max={500}
            required
            defaultValue={profile?.travelRadiusMiles ?? 25}
          />
        </Field>
      </div>
      <Field
        label="Experience summary"
        hint="A few sentences helps managers decide"
        error={state?.fieldErrors?.experienceSummary}
      >
        <textarea
          name="experienceSummary"
          required
          minLength={10}
          defaultValue={profile?.experienceSummary ?? ""}
          placeholder="3 years on UK commercials and drama. Comfortable with traffic management, unit base, and long outdoor days."
        />
      </Field>
      <Field label="Availability" error={state?.fieldErrors?.availability}>
        <select
          name="availability"
          defaultValue={profile?.availability ?? "OPEN_TO_WORK"}
        >
          <option value="ACTIVELY_LOOKING">Actively looking</option>
          <option value="OPEN_TO_WORK">Open to work</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Own transport" hint="Optional">
          <select
            name="hasTransport"
            defaultValue={boolDefault(profile?.hasTransport)}
          >
            <option value="">Not specified</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="Driver’s licence" hint="Optional">
          <select
            name="hasDriversLicence"
            defaultValue={boolDefault(profile?.hasDriversLicence)}
          >
            <option value="">Not specified</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>
      <Field
        label="Relevant training or credentials"
        hint="Optional"
        error={state?.fieldErrors?.training}
      >
        <input
          name="training"
          defaultValue={profile?.training ?? ""}
          placeholder="E.g. NRSWA chapter 8, first aid"
        />
      </Field>
      <Field
        label="Photo URL"
        hint="Optional. Paste a link to a simple headshot."
        error={state?.fieldErrors?.photoUrl}
      >
        <input
          type="url"
          name="photoUrl"
          defaultValue={profile?.photoUrl ?? ""}
          placeholder="https://…"
        />
      </Field>
      <Submit label={profile ? "Save changes" : "Create profile"} />
    </form>
  );
}
