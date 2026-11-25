import { isFounderEmail } from "@/lib/founder-identity";

function listed(email: string, list?: string) {
  return (list ?? "").split(",").some(entry => entry.trim().toLowerCase() === email);
}

export function invitedRole(address?: string | null) {
  const email = address?.trim().toLowerCase();
  if (!email) return null;
  const manager = listed(email, process.env.PILOT_MANAGER_EMAILS);
  const marshal = listed(email, process.env.PILOT_MARSHAL_EMAILS);
  if (manager && marshal) return "CONFLICT";
  return manager ? "MANAGER" : marshal ? "MARSHAL" : null;
}

export function isPilotParticipant(address?: string | null, role?: string | null): boolean {
  const email = address?.trim().toLowerCase();
  if (!email) return false;
  if (isFounderEmail(email)) return true;
  const intended = invitedRole(email);
  if (intended) return intended !== "CONFLICT" && intended === role;
  return listed(email, process.env.PILOT_PARTICIPANT_EMAILS);
}


// The vacancy screen only needs accounts with an unambiguous role-bound invitation.
export function invitedMarshalAddresses() {
  return (process.env.PILOT_MARSHAL_EMAILS ?? "").split(",")
    .map(entry => entry.trim().toLowerCase()).filter(email => invitedRole(email) === "MARSHAL");
}
