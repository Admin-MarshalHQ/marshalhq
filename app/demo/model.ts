import { acceptedCount, hasOpenSlot } from "@/lib/capacity";

export const productions = [
  {
    id: "lockside", productionName: "Lockside", unit: "TV drama · Dawn exterior",
    location: "Hackney Wick, London E9", offset: 0, dailyStartTime: "05:30", dailyEndTime: "15:30",
    rate: 185, marshalsNeeded: 2,
    duties: "Meet the first crew vans at unit base and keep the towpath clear for the dawn walk-and-talk.",
    travel: "Cycle racks at unit base. No crew parking. Check your route for the early call.",
    experience: "Public-facing exterior work and clear radio calls.",
    note: "I can cycle to unit base for 05:15. I’ve covered towpath exteriors before.",
  },
  {
    id: "paper-rooms", productionName: "Paper Rooms", unit: "Feature film · Stage door",
    location: "Park Royal, London NW10", offset: 2, dailyStartTime: "07:00", dailyEndTime: "17:00",
    rate: 180, marshalsNeeded: 2,
    duties: "Check crew arrivals at the stage door and direct deliveries to the holding area.",
    travel: "Crew parking at unit base. Allow ten minutes to walk to the stage.",
    experience: "Stage access and delivery marshalling experience welcome.",
    note: "Available for the full day. I’ve covered stage-door access on a feature.",
  },
  {
    id: "still-weather", productionName: "Still Weather", unit: "Commercial · Street unit",
    location: "Deptford, London SE8", offset: 4, dailyStartTime: "09:00", dailyEndTime: "18:00",
    rate: 175, marshalsNeeded: 1,
    duties: "Keep shop entrances accessible between takes and guide background artists to holding.",
    travel: "Meet outside unit base, a short walk from Deptford station.",
    experience: "Comfortable liaising with traders and the public.",
    note: "I’m available through wrap and know the area well.",
  },
] as const;

export type ShiftId = typeof productions[number]["id"];
export type DemoShift = typeof productions[number] & { startDate: Date; endDate: Date; rateUnit: "DAY" };
export const company = "Kestrel Yard Locations";
export const manager = { name: "Ellis Wren", email: "ellis@example.invalid", phone: "07700 900142" };
export const profiles = {
  kit: { name: "Kit Mercer", base: "Bow, East London", travel: "35 miles · bicycle and public transport",
    experience: "Location marshal on street exteriors and studio shoots. Used to working on radio, meeting early crew and keeping access clear for residents.",
    email: "kit@example.invalid", phone: "07700 900143" },
  nell: { name: "Nell Arden", base: "Stratford, East London", travel: "25 miles · own car",
    experience: "Exterior units, crew parking and unit-base arrivals on returning dramas.",
    email: "nell@example.invalid", phone: "07700 900144" },
} as const;

export type Marshal = keyof typeof profiles;
export type Application = { shift: ShiftId; marshal: Marshal; status: "APPLIED" | "ACCEPTED" };
export const initialApplications: Application[] = [
  { shift: "lockside", marshal: "nell", status: "ACCEPTED" },
  { shift: "paper-rooms", marshal: "kit", status: "APPLIED" },
];
export type Action = { type: "apply" | "accept"; shift: ShiftId; marshal: Marshal };

export function roster(shift: typeof productions[number], applications: Application[]) {
  const entries = applications.filter(a => a.shift === shift.id);
  const booked = acceptedCount({ ...shift, applications: entries });
  const open = hasOpenSlot(booked, shift.marshalsNeeded);
  return { entries, booked, open, status: open ? "OPEN" : "FILLED", paused: false };
}

// Stored moves are untrusted. Replaying only permitted moves also makes repeated taps idempotent.
export function transition(applications: Application[], move: unknown): Application[] {
  if (!move || typeof move !== "object" || !("shift" in move) || !("marshal" in move) || !("type" in move)) return applications;
  const shift = productions.find(s => s.id === move.shift);
  if (!shift) return applications;
  const { entries, open } = roster(shift, applications);
  if (!open) return applications;
  const existing = entries.find(a => a.marshal === move.marshal);
  if (move.type === "apply" && move.marshal === "kit" && !existing) {
    return [{ shift: shift.id, marshal: "kit", status: "APPLIED" }, ...applications];
  }
  if (move.type === "accept" && existing?.status === "APPLIED") {
    return applications.map(a => a === existing ? { ...a, status: "ACCEPTED" } : a);
  }
  return applications;
}

export function makeShifts(firstDay: string): DemoShift[] {
  return productions.map(shift => {
    const date = new Date(firstDay);
    date.setUTCDate(date.getUTCDate() + shift.offset);
    return { ...shift, startDate: date, endDate: date, rateUnit: "DAY" };
  });
}
