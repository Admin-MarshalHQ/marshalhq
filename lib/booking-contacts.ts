import { prisma } from "./db";
import { DAY, dayAfter, wrapDateTime, type Schedule } from "./state";

type ContactShift = Schedule & { id: string; managerId: string };
type Booking = { id: string; releasedFrom: Date | null };

export function bookingContactEndsAt(shift: Schedule, releasedFrom: Date | null) {
  const lastCall = releasedFrom ? dayAfter(releasedFrom, -1) : shift.endDate;
  const wrap = wrapDateTime(lastCall, shift.dailyStartTime, shift.dailyEndTime);
  return new Date(+wrap + (releasedFrom ? 0 : 7 * DAY));
}

// Bind the schedule and release used to calculate expiry to the same fresh
// query that reads contact details. A changed booking must be read again.
function currentShift(shift: ContactShift, managerId: string) {
  return {
    id: shift.id, managerId, manager: { disabledAt: null },
    status: { in: ["OPEN", "FILLED", "RECRUITMENT_STOPPED", "COMPLETED"] }, paused: false,
    endDate: shift.endDate, dailyStartTime: shift.dailyStartTime, dailyEndTime: shift.dailyEndTime,
  };
}

export async function bookedMarshalContacts(managerId: string, shift: ContactShift, bookings: Booking[], now = new Date()) {
  const active = bookings.filter(b => bookingContactEndsAt(shift, b.releasedFrom) > now);
  if (!active.length || shift.managerId !== managerId) return [];
  return prisma.user.findMany({
    where: {
      disabledAt: null, marshalProfile: { paused: false },
      applications: { some: {
        status: "ACCEPTED", shift: currentShift(shift, managerId),
        OR: active.map(b => ({ id: b.id, releasedFrom: b.releasedFrom })),
      } },
    },
    select: { id: true, email: true, phone: true },
  });
}

export async function bookedManagerContact(marshalId: string, shift: ContactShift, booking: Booking, now = new Date()) {
  if (bookingContactEndsAt(shift, booking.releasedFrom) <= now) return null;
  return prisma.user.findFirst({
    where: {
      id: shift.managerId, disabledAt: null,
      shifts: { some: { ...currentShift(shift, shift.managerId), applications: { some: {
        id: booking.id, marshalId, status: "ACCEPTED", releasedFrom: booking.releasedFrom,
        marshal: { disabledAt: null, marshalProfile: { paused: false } },
      } } } },
    },
    select: { email: true, phone: true, managerProfile: { select: { companyName: true, displayName: true } } },
  });
}
