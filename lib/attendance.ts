export const attendanceLabels = {
  WORKED: "Worked as agreed",
  WORKED_FLAGGED: "Worked — feedback withheld",
  NOT_WORKED: "Did not work",
  UNRESOLVED: "Awaiting founder review",
} as const;

export function isAttendance(value: unknown): value is keyof typeof attendanceLabels {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(attendanceLabels, value);
}

export function worked(value: string | null) {
  return value === "WORKED" || value === "WORKED_FLAGGED";
}

export const workedFilter = { attendance: { in: ["WORKED", "WORKED_FLAGGED"] } };
export const confirmedWork = { status: "ACCEPTED", shift: { status: "COMPLETED" }, ...workedFilter };
export const confirmedCount = { select: { applications: { where: confirmedWork } } };
