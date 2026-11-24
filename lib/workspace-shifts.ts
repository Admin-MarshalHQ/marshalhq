import { bookedSchedule } from "./availability";
import { hasOpenSlot } from "@/lib/capacity";
import { isShiftSchedulable, canCompleteShift, hasShiftEnded, shiftStartDateTime } from "@/lib/state";

type ScheduledShift = {
  startDate: Date;
  endDate: Date;
  dailyStartTime: string;
  dailyEndTime: string;
  status: string;
};

type ManagerShift = ScheduledShift & {
  paused: boolean;
  marshalsNeeded: number;
  bookedCount: number;
  pendingCount: number;
};

export function hiringOpen(shift: ScheduledShift & { paused: boolean }, now = new Date()) {
  return shift.status === "OPEN" && !shift.paused && isShiftSchedulable(shift, now);
}

export function actionableApplicantCount(shift: ManagerShift, now = new Date()): number {
  return hiringOpen(shift, now) && hasOpenSlot(shift.bookedCount, shift.marshalsNeeded) ? shift.pendingCount : 0;
}

export function managerAttention<T extends ManagerShift>(shifts: T[], now: Date) {
  const reviews = [];
  const closeouts = [];
  const ordered = shifts
    .map((shift) => ({ shift, callTime: shiftStartDateTime(shift.startDate, shift.dailyStartTime) }))
    .sort((a, b) => a.callTime.getTime() - b.callTime.getTime());

  for (const entry of ordered) {
    const { shift, callTime } = entry;
    const count = actionableApplicantCount(shift, now);
    if (canCompleteShift(shift, now)) {
      closeouts.push({ ...entry, count, kind: "completion" as const });
    } else if (shift.status === "OPEN" && callTime <= now) {
      closeouts.push({ ...entry, count, kind: "elapsed" as const });
    } else if (count > 0) {
      reviews.push({ ...entry, count, kind: "review" as const });
    }
  }

  return [...reviews, ...closeouts];
}

export function currentBookings<T extends { status: string; shift: ScheduledShift; releasedFrom?: Date | null }>(
  applications: T[],
  now: Date,
): T[] {
  return applications
    .map(application => ({...application, shift: bookedSchedule(application)}))
    .filter(({ status, shift }) =>
      status === "ACCEPTED" &&
      (shift.status === "OPEN" || shift.status === "FILLED") &&
      !hasShiftEnded(shift, now),
    )
    .map((application) => ({
      application,
      callTime: shiftStartDateTime(application.shift.startDate, application.shift.dailyStartTime),
    }))
    .sort((a, b) => a.callTime.getTime() - b.callTime.getTime())
    .map(({ application }) => application);
}
