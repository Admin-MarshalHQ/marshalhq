"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitWaitlistEntryAction } from "@/app/actions/waitlist";
import { WAITLIST_ROLE_LABEL, type WaitlistRole } from "@/lib/types";

const ROLE_OPTIONS: {
  value: WaitlistRole;
  description: string;
}[] = [
  {
    value: "MANAGER",
    description: "I hire marshals.",
  },
  {
    value: "MARSHAL",
    description: "I work as a marshal.",
  },
  {
    value: "OTHER",
    description: "Adjacent to either side.",
  },
];

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn--primary btn--lg"
      type="submit"
      disabled={pending || disabled}
    >
      {pending ? "Sending..." : "Join the waitlist"}
      <span className="btn__arrow" aria-hidden="true">
        &rarr;
      </span>
    </button>
  );
}

export default function EarlyAccessForm({
  defaultEmail = "",
}: {
  defaultEmail?: string;
}) {
  const [state, action] = useFormState(submitWaitlistEntryAction, null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState<WaitlistRole | "">("");
  const [roleOther, setRoleOther] = useState("");
  const otherInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    if (role === "OTHER") {
      otherInputRef.current?.focus();
    }
  }, [role]);

  const hasUsableEmail = /\S+@\S+\.\S+/.test(email);
  const otherRoleComplete = role !== "OTHER" || roleOther.trim().length > 0;
  const canSubmit =
    name.trim().length > 0 && hasUsableEmail && Boolean(role) && otherRoleComplete;

  return (
    <form action={action} className="form waitlist-form">
      <input type="hidden" name="consentToContact" value="on" />

      {state?.error && (
        <div className="form__error" role="alert">
          {state.error}
        </div>
      )}

      <div className="form__grid">
        <Field label="Full name" required>
          <input
            type="text"
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Carter"
            autoComplete="name"
          />
        </Field>

        <Field label="Email address" required>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@production.co.uk"
            autoComplete="email"
          />
        </Field>

        <div className="field field--full">
          <span className="field__lbl">
            <span>
              I am a
              <i className="field__req" aria-hidden="true">
                *
              </i>
            </span>
          </span>

          <div className="roles">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`role${role === option.value ? " role--on" : ""}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  required
                  checked={role === option.value}
                  onChange={() => {
                    setRole(option.value);
                    if (option.value !== "OTHER") {
                      setRoleOther("");
                    }
                  }}
                />
                <span className="role__check" aria-hidden="true" />
                <span className="role__label">
                  <b>{WAITLIST_ROLE_LABEL[option.value]}</b>
                  <em>{option.description}</em>
                </span>
              </label>
            ))}
          </div>

          {role === "OTHER" && (
            <div className="roleother">
              <label className="roleother__lbl" htmlFor="roleOther">
                <span>
                  Tell us how you&apos;re connected to marshal hiring
                  <i className="field__req" aria-hidden="true">
                    *
                  </i>
                </span>
                <span className="mono field__hint">required</span>
              </label>
              <input
                id="roleOther"
                ref={otherInputRef}
                type="text"
                name="roleOther"
                required
                maxLength={120}
                value={roleOther}
                onChange={(event) => setRoleOther(event.target.value)}
                placeholder="e.g. AD, production coordinator, agency, supplier"
              />
            </div>
          )}
        </div>

        <Field label="Company or production" hint="optional">
          <input
            type="text"
            name="company"
            maxLength={120}
            placeholder="e.g. Riverside Pictures"
            autoComplete="organization"
          />
        </Field>

        <Field label="Region or base" hint="optional">
          <input
            type="text"
            name="location"
            maxLength={120}
            placeholder="e.g. London / SE"
          />
        </Field>

        <Field label="Anything else worth knowing" hint="optional" full>
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            placeholder="Shift volume, regions you cover, what would make this useful for you..."
          />
        </Field>
      </div>

      <div className="form__foot">
        <SubmitButton disabled={!canSubmit} />
        <p className="mono form__legal">
          By joining, you agree to a single confirmation email and one update
          when MarshalHQ opens. Nothing else.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`field${full ? " field--full" : ""}`}>
      <span className="field__lbl">
        <span>
          {label}
          {required && (
            <i className="field__req" aria-hidden="true">
              *
            </i>
          )}
        </span>
        {hint && <span className="mono field__hint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
