// Set SIGNUP_OPEN_UNTIL to an absolute UTC timestamp for a testing window.
export function isSignupOpen(now = Date.now()) {
  const until = process.env.SIGNUP_OPEN_UNTIL;
  if (!until || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(until)) return false;
  const end = Date.parse(until);
  if (!Number.isFinite(end)) return false;
  return new Date(end).toISOString() === until.replace("Z", ".000Z") && now < end;
}
