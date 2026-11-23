export const attendanceLabels = {
  WORKED: "Worked as agreed",
  WORKED_FLAGGED: "Worked, reliability issue confirmed",
  NOT_WORKED: "Did not work",
  UNRESOLVED: "Awaiting founder review",
} as const;

export function isAttendance(value: unknown): value is keyof typeof attendanceLabels {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(attendanceLabels, value);
}

export function worked(value: string | null) {
  return value === null || value === "WORKED" || value === "WORKED_FLAGGED";
}

export const workedFilter = { OR: [{ attendance: null }, { attendance: { in: ["WORKED", "WORKED_FLAGGED"] } }] };
