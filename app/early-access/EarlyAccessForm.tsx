"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitWaitlistEntryAction } from "@/app/actions/waitlist";
import { Alert, Button, Field } from "@/components/ui";
import {
  WAITLIST_AVAILABILITY_LABEL,
  WAITLIST_EXPECTED_NEED_LABEL,
  WAITLIST_MARSHAL_EXPERIENCE_LABEL,
  WAITLIST_ROLE_LABEL,
  type WaitlistAvailability,
  type WaitlistExpectedNeed,
  type WaitlistMarshalExperience,
  type WaitlistRole,
} from "@/lib/types";

const ROLE_ORDER: WaitlistRole[] = ["MANAGER", "MARSHAL"];
const EXPECTED_NEED_ORDER: WaitlistExpectedNeed[] = [
  "URGENT",
  "OCCASIONAL",
  "REGULAR",
  "FUTURE_PROJECT",
];
const MARSHAL_EXPERIENCE_ORDER: WaitlistMarshalExperience[] = [
  "NEW",
  "SOME",
  "EXPERIENCED",
];
const AVAILABILITY_ORDER: WaitlistAvailability[] = [
  "AVAILABLE_NOW",
  "AVAILABLE_SOON",
  "FUTURE_INTEREST",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending…" : "Register interest"}
    </Button>
  );
}

export default function EarlyAccessForm() {
  const [state, action] = useFormState(submitWaitlistEntryAction, null);
  const [role, setRole] = useState<WaitlistRole | "">("");

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <Field label="Full name">
        <input
          type="text"
          name="name"
          required
          autoComplete="name"
          maxLength={120}
        />
      </Field>

      <Field label="Email" hint="So we can contact you about access.">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </Field>

      <Field label="I am a">
        <select
          name="role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value as WaitlistRole | "")}
        >
          <option value="" disabled>
            Choose one
          </option>
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {WAITLIST_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Location or base area" hint="City or region in the UK.">
        <input
          type="text"
          name="location"
          required
          maxLength={120}
          placeholder="e.g. Manchester, North West"
        />
      </Field>

      {role === "MANAGER" && (
        <>
          <Field label="Production-side role (optional)">
            <input
              type="text"
              name="managerRole"
              maxLength={120}
              placeholder="e.g. Location manager, production coordinator"
            />
          </Field>
          <Field label="Expected marshal need (optional)">
            <select name="expectedNeed" defaultValue="">
              <option value="">Prefer not to say</option>
              {EXPECTED_NEED_ORDER.map((n) => (
                <option key={n} value={n}>
                  {WAITLIST_EXPECTED_NEED_LABEL[n]}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {role === "MARSHAL" && (
        <>
          <Field label="Experience level (optional)">
            <select name="marshalExperience" defaultValue="">
              <option value="">Prefer not to say</option>
              {MARSHAL_EXPERIENCE_ORDER.map((e) => (
                <option key={e} value={e}>
                  {WAITLIST_MARSHAL_EXPERIENCE_LABEL[e]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Availability (optional)">
            <select name="availability" defaultValue="">
              <option value="">Prefer not to say</option>
              {AVAILABILITY_ORDER.map((a) => (
                <option key={a} value={a}>
                  {WAITLIST_AVAILABILITY_LABEL[a]}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      <Field
        label="Short note"
        hint="A sentence or two about your interest."
      >
        <textarea
          name="note"
          required
          rows={5}
          minLength={10}
          maxLength={1000}
          placeholder="What kind of work or cover are you thinking about?"
        />
      </Field>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="consentToContact"
          required
          className="mt-1"
        />
        <span>
          I agree that MarshalHQ may contact me about early access and private
          beta availability.
        </span>
      </label>

      <Submit />
    </form>
  );
}
