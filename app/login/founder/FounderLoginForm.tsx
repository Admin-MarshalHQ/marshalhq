"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestFounderPasscodeAction, verifyFounderPasscodeAction } from "@/app/actions/founder-login";
import { Alert, Button, Field } from "@/components/ui";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function Resend() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="shell-link text-coral-ink">
      {pending ? "Requesting…" : "Request a new code"}
    </button>
  );
}

export default function FounderLoginForm({ next }: { next: string }) {
  const [request, requestCode] = useFormState(requestFounderPasscodeAction, null);
  const [resend, resendCode] = useFormState(requestFounderPasscodeAction, null);
  const [verification, verifyCode] = useFormState(verifyFounderPasscodeAction, null);

  if (!request?.email) {
    return (
      <form action={requestCode} className="space-y-4">
        {request?.error && <Alert tone="danger">{request.error}</Alert>}
        <Field label="Founder email">
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </Field>
        <Submit label="Email me a code" pendingLabel="Requesting…" />
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted" role="status">
        If this address can sign in, check your inbox for an 8-digit code. It expires after 10 minutes.
      </p>
      <form action={verifyCode} className="space-y-4">
        {verification?.error && <Alert tone="danger">{verification.error}</Alert>}
        <input type="hidden" name="email" value={request.email} />
        <input type="hidden" name="next" value={next} />
        <Field label="One-time code">
          <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required />
        </Field>
        <Submit label="Log in" pendingLabel="Logging in…" />
      </form>
      <form action={resendCode} className="flex flex-wrap justify-between gap-2 text-sm">
        <input type="hidden" name="email" value={request.email} />
        <a href={`/login/founder?next=${encodeURIComponent(next)}`} className="shell-link text-coral-ink">
          Use another email
        </a>
        <Resend />
      </form>
      {resend?.email && (
        <p className="text-sm text-ink-muted" role="status">
          Check your inbox. If you requested a code in the past minute, wait before requesting another.
        </p>
      )}
    </div>
  );
}
