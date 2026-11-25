"use client";

import { useFormState, useFormStatus } from "react-dom";
import { acknowledgePilotDocuments, registerPilotAccount, requestJoinCode } from "@/app/actions/pilot-admission";
import { Alert, Button, Field } from "@/components/ui";
import { useState } from "react";

function Submit({children}: {children: string}) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Please wait…" : children}</Button>;
}

export function JoinCodeForm() {
  const [state, action] = useFormState(requestJoinCode, null);
  return <form action={action} className="space-y-3">
    <Field label="Invited email address"><input name="email" type="email" autoComplete="email" required /></Field>
    <Submit>Email me a registration code</Submit>
    {state && <Alert>{state.message}</Alert>}
  </form>;
}

export function PilotAgreementForm({register, termsVersion, noticeVersion}: {register?: boolean; termsVersion: string; noticeVersion: string}) {
  const [role, setRole] = useState("");
  const [state, action] = useFormState(register ? registerPilotAccount : acknowledgePilotDocuments, null);
  return <form action={action} className="space-y-3">
    {register && <>
      <Field label="Invited email address"><input name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Code from your email"><input name="code" autoComplete="one-time-code" required /></Field>
      <Field label="Invited role"><select name="role" value={role} onChange={e=>setRole(e.target.value)} required>
        <option value="">Choose your role</option><option value="MANAGER">Location manager</option><option value="MARSHAL">Location marshal</option>
      </select></Field>
      {role === "MANAGER" && <>
        <Field label="Hirer or production company"><input name="companyName" required /></Field>
        <Field label="Your name"><input name="displayName" required /></Field>
      </>}
      <Field label="Choose a password"><input type="password" name="password" minLength={8} autoComplete="new-password" required /></Field>
    </>}
    <input type="hidden" name="termsVersion" value={termsVersion} /><input type="hidden" name="noticeVersion" value={noticeVersion} />
    <label className="block"><input type="checkbox" name="agreeTerms" value="yes" required /> I am 18 or over and agree to the private pilot terms shown here.</label>
    <label className="block"><input type="checkbox" name="receiveNotice" value="yes" required /> I acknowledge receipt of the private pilot privacy notice shown here.</label>
    <Submit>{register ? "Create my invited account" : "Record my agreement"}</Submit>
    {state && <Alert>{state.message}</Alert>}
  </form>;
}
