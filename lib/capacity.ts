export type CapacityShift = {
  marshalsNeeded: number;
  applications?: { status: string }[];
};

export function acceptedCount(shift: CapacityShift): number {
  return shift.applications?.filter((a) => a.status === "ACCEPTED").length ?? 0;
}

export function capacityLabel(accepted: number, needed: number): string {
  return `${accepted}/${needed} booked`;
}

export function hasOpenSlot(accepted: number, needed: number): boolean {
  return accepted < needed;
}
