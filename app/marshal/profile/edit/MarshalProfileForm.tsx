"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Field, FormSection } from "@/components/ui";
import type { MarshalProfile } from "@prisma/client";
import { saveMarshalProfileAction } from "@/app/actions/profile";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
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
  phone,
}: {
  profile: MarshalProfile | null;
  phone: string | null;
}) {
  const [state, action] = useFormState(saveMarshalProfileAction, null);
  const [summaryLen, setSummaryLen] = useState(
    profile?.experienceSummary?.length ?? 0,
  );
  return (
    <form action={action} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <FormSection
        title="Who you are"
        description="Your name and area are shown to managers when you apply. Your phone never appears on your profile — it's released only after a booking is confirmed."
      >
        <Field label="Full name" error={state?.fieldErrors?.fullName}>
          <input
            name="fullName"
            required
            maxLength={120}
            defaultValue={profile?.fullName ?? ""}
          />
        </Field>
        <Field
          label="Phone"
          hint="Released only after a booking is confirmed"
        >
          <input
            type="tel"
            name="phone"
            defaultValue={phone ?? ""}
            autoComplete="tel"
            placeholder="07911 123456"
          />
        </Field>
      </FormSection>

      <FormSection title="Where you work">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Base location"
            error={state?.fieldErrors?.baseLocation}
          >
            <input
              name="baseLocation"
              required
              maxLength={120}
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
      </FormSection>

      <FormSection
        title="Experience"
        description="This is the main thing managers read before deciding. A few specific sentences beat a long list."
      >
        <Field
          label="Experience summary"
          error={state?.fieldErrors?.experienceSummary}
        >
          <textarea
            name="experienceSummary"
            required
            minLength={10}
            maxLength={2000}
            defaultValue={profile?.experienceSummary ?? ""}
            onChange={(e) => setSummaryLen(e.target.value.length)}
            placeholder="3 years on UK commercials and drama. Comfortable with traffic management, unit base, and long outdoor days."
          />
          <div className="mt-1 text-right">
            <span className="font-mono text-[11px] text-ink-soft">
              {summaryLen}/2000
            </span>
          </div>
        </Field>
        <Field
          label="Relevant training or credentials"
          hint="Optional"
          error={state?.fieldErrors?.training}
        >
          <input
            name="training"
            maxLength={500}
            defaultValue={profile?.training ?? ""}
            placeholder="E.g. NRSWA chapter 8, first aid"
          />
        </Field>
      </FormSection>

      <FormSection title="Practical details">
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
      </FormSection>

      <div className="border-t border-line pt-4">
        <Submit label={profile ? "Save changes" : "Create profile"} />
      </div>
    </form>
  );
}
