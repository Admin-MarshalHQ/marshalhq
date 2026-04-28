"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitSupportRequestAction } from "@/app/actions/recovery";
import { Alert, Button, Field } from "@/components/ui";
import { SUPPORT_CATEGORY_LABEL, type SupportCategory } from "@/lib/types";

const CATEGORY_ORDER: SupportCategory[] = [
  "ACCOUNT_ACCESS",
  "SHIFT_ISSUE",
  "APPLICATION_ISSUE",
  "CONTACT_BOOKING",
  "PROFILE_ISSUE",
  "PRIVACY_DELETION",
  "TRUST_SAFETY",
  "OTHER",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending\u2026" : "Send request"}
    </Button>
  );
}

export default function SupportForm({
  loggedInEmail,
}: {
  loggedInEmail: string | null;
}) {
  const [state, action] = useFormState(submitSupportRequestAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      {loggedInEmail ? (
        <div className="rounded-md border border-line bg-surface-subtle px-3 py-2 text-sm">
          <span className="text-ink-muted">Sending as</span>{" "}
          <span className="font-medium text-ink">{loggedInEmail}</span>
        </div>
      ) : (
        <>
          <Field label="Email" hint="So we can reply.">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Name (optional)">
            <input type="text" name="name" autoComplete="name" />
          </Field>
        </>
      )}

      <Field label="What's this about?">
        <select name="category" required defaultValue="">
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {SUPPORT_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Message" hint="Tell us what&rsquo;s happening.">
        <textarea
          name="message"
          required
          rows={6}
          minLength={10}
          maxLength={4000}
          placeholder="A short description of the issue or request."
        />
      </Field>

      <Submit />
    </form>
  );
}
