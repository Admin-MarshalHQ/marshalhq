"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signupAction } from "@/app/actions/auth";
import { Alert, Button, Field } from "@/components/ui";

function Submit({ role }: { role: "MANAGER" | "MARSHAL" | null }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !role} className="w-full">
      {pending
        ? "Creating account\u2026"
        : role === "MANAGER"
          ? "Create manager account"
          : role === "MARSHAL"
            ? "Create marshal account"
            : "Choose a role to continue"}
    </Button>
  );
}

export default function SignupForm() {
  const [state, action] = useFormState(signupAction, null);
  const [role, setRole] = useState<"MANAGER" | "MARSHAL" | null>(null);

  return (
    <form action={action} className="space-y-5">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <div>
        <p className="mb-2 text-sm font-medium text-ink-muted">
          I’m signing up as a
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-md border p-3 transition ${
              role === "MANAGER"
                ? "border-accent bg-[#f4f7fb]"
                : "border-line bg-white"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="MANAGER"
              className="hidden"
              onChange={() => setRole("MANAGER")}
              required
            />
            <div className="text-sm font-semibold">Production manager</div>
            <p className="mt-1 text-xs text-ink-muted">
              Post shifts and hire marshals.
            </p>
          </label>
          <label
            className={`cursor-pointer rounded-md border p-3 transition ${
              role === "MARSHAL"
                ? "border-accent bg-[#f4f7fb]"
                : "border-line bg-white"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="MARSHAL"
              className="hidden"
              onChange={() => setRole("MARSHAL")}
              required
            />
            <div className="text-sm font-semibold">Location marshal</div>
            <p className="mt-1 text-xs text-ink-muted">
              Browse shifts and apply for work.
            </p>
          </label>
        </div>
      </div>

      {role === "MANAGER" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company or production house">
            <input type="text" name="companyName" required />
          </Field>
          <Field label="Your name">
            <input type="text" name="displayName" required />
          </Field>
        </div>
      )}

      <Field
        label="Pilot code"
        hint="Founder-issued code for the private pilot."
      >
        <input
          type="text"
          name="pilotCode"
          required
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      <Field label="Email">
        <input type="email" name="email" required autoComplete="email" />
      </Field>
      <Field
        label="Phone"
        hint="UK number, e.g. 07911 123456. Released only after a booking is confirmed."
      >
        <input
          type="tel"
          name="phone"
          required
          autoComplete="tel"
          placeholder="07911 123456"
        />
      </Field>
      <Field label="Password" hint="At least 8 characters">
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <Submit role={role} />
    </form>
  );
}
