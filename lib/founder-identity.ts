export function isFounderEmail(email: string | null | undefined): boolean {
  const normalised = email?.trim().toLowerCase();
  if (!normalised) return false;
  return (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .some((address) => address.trim().toLowerCase() === normalised);
}

export function isFounderSession(user: {
  email?: string | null;
  emailVerifiedAt?: string | null;
  founderPasscode?: boolean;
} | null | undefined): boolean {
  return !!user?.emailVerifiedAt && user.founderPasscode === true && isFounderEmail(user.email);
}
