import { isFounderEmail } from "@/lib/founder-identity";

export function isPilotParticipant(email: string | null | undefined): boolean {
  const normalised = email?.trim().toLowerCase();
  if (!normalised) return false;
  return isFounderEmail(normalised) || (process.env.PILOT_PARTICIPANT_EMAILS ?? "")
    .split(",").some(entry => entry.trim().toLowerCase() === normalised);
}
