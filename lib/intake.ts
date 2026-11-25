// Public collection is on hold. Isolated automated tests can still exercise the
// intake transactions with fixtures. Reopening either route needs a reviewed change.
export function intakeHeld() {
  return process.env.SETRU_FIXTURE_INTAKE !== "1" || process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);
}
