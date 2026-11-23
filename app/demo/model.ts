import { acceptedCount, hasOpenSlot } from "@/lib/capacity";

export const productions = [
  {
    id: "lockside", productionName: "Lockside", unit: "TV drama · Dawn exterior",
    location: "Hackney Wick, London E9", offset: 0, dailyStartTime: "05:30", dailyEndTime: "15:30",
    rate: 185, marshalsNeeded: 2,
    summary: "Meet the first crew vans at unit base, then cover pedestrian access on the towpath.",
    arrival: "Sign in with Locations at the blue gate of Lockside Yard, off Wick Lane.",
    duties: "Meet the first crew vans at the gate and show drivers to the unloading bays. Once the vans are in, take a radio down to the towpath. Ask walkers and cyclists to wait during takes and let them through as soon as you hear cut.",
    travel: "No crew parking. There are cycle racks inside the blue gate.",
    experience: "You’ll be working within earshot of camera. We need someone used to short radio calls and talking to the public between takes.",
    note: "I’ll cycle from Bow and be at the blue gate by 05:15. I can take the towpath position after the vans are in and stay through the 15:30 wrap.",
  },
  {
    id: "paper-rooms", productionName: "Paper Rooms", unit: "Feature film · Stage door",
    location: "Park Royal, London NW10", offset: 2, dailyStartTime: "07:00", dailyEndTime: "17:00",
    rate: 180, marshalsNeeded: 2,
    summary: "Check crew in at the stage door and take deliveries round to the loading bay.",
    arrival: "Collect the day list and a radio from the stage-door desk at Stage Four.",
    duties: "Check arrivals against the day list and radio the floor runner for anyone you can’t place. During takes, keep the stage door quiet. Route couriers to the loading bay and hand the marked-up list back at wrap.",
    travel: "Use the pedestrian gate at unit base. Allow ten minutes on foot from crew parking to Stage Four.",
    experience: "You’ll have a printed list. Be comfortable checking names discreetly while keeping the doorway clear.",
    note: "I’ll come by public transport and use the pedestrian gate. I’ve allowed for the walk to Stage Four and can hand the list back at the 17:00 wrap.",
  },
  {
    id: "still-weather", productionName: "Still Weather", unit: "Commercial · Street unit",
    location: "Deptford, London SE8", offset: 4, dailyStartTime: "09:00", dailyEndTime: "18:00",
    rate: 175, marshalsNeeded: 1,
    summary: "Cover shop entrances on a trading street and guide background artists between takes.",
    arrival: "Meet Locations beside the wardrobe truck in Finch Court, off the high street.",
    duties: "Walk the shopfronts with the location assistant before camera turns. Keep a clear route for customers and deliveries. Between takes, bring background artists back to holding without blocking the shop doors.",
    travel: "Approach Finch Court on foot from Deptford station. The courtyard is reserved for unit vehicles.",
    experience: "The shops stay open all day. If a trader needs a delivery through during a take, radio Locations and stay with the trader.",
    note: "I can meet at the wardrobe truck for 09:00 and stay until 18:00. On the last shopping parade I covered, we agreed a delivery route with each shop before the first take.",
  },
] as const;

export type ShiftId = typeof productions[number]["id"];
export type DemoShift = typeof productions[number] & { startDate: Date; endDate: Date; rateUnit: "DAY" };
export const company = "Kestrel Yard Locations";
export const manager = { name: "Ellis Wren", email: "ellis@example.invalid", phone: "07700 900142" };
export const profiles = {
  kit: {
    name: "Kit Mercer", base: "Bow, East London", radius: 35, transport: "Bicycle and public transport",
    availability: "Actively looking", completedCount: 3,
    experience: ["I work pedestrian holds on towpaths and market streets.", "I take my cues over the radio and keep residents moving between takes. On studio days I’ve checked crew against the day list and sent deliveries round to the dock."],
    email: "kit@example.invalid", phone: "07700 900143",
  },
  robin: {
    name: "Robin Vale", base: "Fish Island, East London", radius: 10, transport: "On foot or by bus",
    availability: "Open to work", completedCount: 0,
    experience: ["Most of my calls are at the unit-base gate.", "I’ve met split van calls on two features, kept loading bays free and covered the resident access point when the unit moved onto the street."],
    email: "robin@example.invalid", phone: "07700 900145",
  },
  nell: {
    name: "Nell Arden", base: "Stratford, East London", radius: 25, transport: "Own car or bicycle",
    availability: "Open to work", completedCount: 5,
    experience: ["I cover crew parking on returning dramas.", "I’ve worked staggered crew arrivals, directed tech trucks into their bays and handed the gate over to security at wrap."],
    email: "nell@example.invalid", phone: "07700 900144",
  },
} as const;

export type Marshal = keyof typeof profiles;
export type Application = { shift: ShiftId; marshal: Marshal; status: "APPLIED" | "ACCEPTED"; coverNote: string };
export const initialApplications: Application[] = [
  { shift: "lockside", marshal: "robin", status: "APPLIED",
    coverNote: "I live a ten-minute walk from the yard and can be at the gate by 05:10. I can take the first vans, move to the towpath and stay to wrap." },
  { shift: "lockside", marshal: "nell", status: "ACCEPTED",
    coverNote: "I’ll leave the car at home and cycle in for the first vans. I can stay on the gate after the other marshal moves to the towpath." },
  { shift: "paper-rooms", marshal: "kit", status: "APPLIED", coverNote: productions[1].note },
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
    return [{ shift: shift.id, marshal: "kit", status: "APPLIED", coverNote: shift.note }, ...applications];
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
