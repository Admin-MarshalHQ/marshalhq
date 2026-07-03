// Pure matcher for saved shift alerts. No Prisma so the matching rule is
// unit-testable without a DB (see scripts/audit_remediation_tests.ts). The
// publish action loads active alerts and filters them through this.

export type AlertCriteria = {
  keyword?: string | null;
  location?: string | null;
  minRate?: number | null;
};

export type MatchableShift = {
  productionName: string;
  location: string;
  duties: string;
  rate: number;
};

/**
 * Whether a published shift satisfies an alert's criteria. All criteria are
 * AND-ed, and any unset criterion is ignored — so an alert with no criteria
 * matches every shift. Keyword matches the production name, location, or duties;
 * location matches the shift location; minRate is a coarse floor compared
 * against the raw rate value regardless of rate unit.
 */
export function matchesAlert(
  shift: MatchableShift,
  alert: AlertCriteria,
): boolean {
  const keyword = alert.keyword?.trim().toLowerCase();
  if (keyword) {
    const haystack =
      `${shift.productionName} ${shift.location} ${shift.duties}`.toLowerCase();
    if (!haystack.includes(keyword)) return false;
  }
  const location = alert.location?.trim().toLowerCase();
  if (location) {
    if (!shift.location.toLowerCase().includes(location)) return false;
  }
  if (alert.minRate != null && shift.rate < alert.minRate) return false;
  return true;
}
