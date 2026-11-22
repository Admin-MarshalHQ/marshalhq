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

      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-ink">I’m signing up as a</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-md border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-ink ${
              role === "MANAGER"
                ? "border-coral-action bg-coral-soft ring-1 ring-coral-action"
                : "border-line-control bg-white hover:bg-surface-subtle"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="MANAGER"
              className="mr-2 size-4"
              onChange={() => setRole("MANAGER")}
              required
            />
            <span className="text-sm font-semibold">Production manager</span>
            <p className="mt-1 text-xs text-ink-muted">
              Post shifts and hire marshals.
            </p>
          </label>
          <label
            className={`cursor-pointer rounded-md border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-ink ${
              role === "MARSHAL"
                ? "border-coral-action bg-coral-soft ring-1 ring-coral-action"
                : "border-line-control bg-white hover:bg-surface-subtle"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="MARSHAL"
              className="mr-2 size-4"
              onChange={() => setRole("MARSHAL")}
              required
            />
            <span className="text-sm font-semibold">Location marshal</span>
            <p className="mt-1 text-xs text-ink-muted">
              Browse shifts and apply for work.
            </p>
          </label>
        </div>
      </fieldset>

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

      <Field label="Email">
        <input type="email" name="email" required autoComplete="email" />
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
