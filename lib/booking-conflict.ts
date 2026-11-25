import type { Prisma } from "@prisma/client";
import { dayAfter, type Schedule } from "./state";
import { schedulesOverlap, bookedSchedule } from "./availability";

export async function conflictingBooking(db: Prisma.TransactionClient, marshalId: string, shift: Schedule & { id: string }) {
  const candidates = await db.application.findMany({
    where: { marshalId, status: "ACCEPTED", shiftId: { not: shift.id },
      shift: { status: { in: ["OPEN", "FILLED", "RECRUITMENT_STOPPED"] }, startDate: { lte: dayAfter(shift.endDate) }, endDate: { gte: dayAfter(shift.startDate, -1) } } },
    select: { releasedFrom: true, shift: { select: { startDate: true, endDate: true, dailyStartTime: true, dailyEndTime: true, productionName: true } } },
  });
  return candidates.find(booking => schedulesOverlap(shift, bookedSchedule(booking)));
}
