// Deterministic seed for the MarshalHQ MVP.
// Produces users, shifts, and applications covering every documented state
// (DRAFT / OPEN / FILLED / CLOSED / COMPLETED for shifts; APPLIED / ACCEPTED /
// REJECTED / WITHDRAWN for applications) so the core workflow can be reviewed
// end-to-end without hand-building data.
//
// Safe to rerun: on each run the seeded managers' shifts and applications are
// wiped and rebuilt, the seeded users' notifications are cleared, and the
// marshal reliability counts are reset before the COMPLETED shift increments
// them — so counts do not accumulate across runs.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash("password123", 10);

  // ---- Founder account -------------------------------------------------
  // Matches FOUNDER_EMAILS in .env. Sign-in flow is a normal manager; the
  // founder panel shows up because the email is in the allowlist.
  await prisma.user.upsert({
    where: { email: "admin@marshalhq.com" },
    create: {
      email: "admin@marshalhq.com",
      passwordHash: pw,
      role: "MANAGER",
      phone: "+442070000000",
      managerProfile: {
        create: {
          companyName: "MarshalHQ (founder)",
          displayName: "MarshalHQ Founder",
        },
      },
    },
    update: {},
  });

  // ---- Managers --------------------------------------------------------
  const sam = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    create: {
      email: "manager@example.com",
      passwordHash: pw,
      role: "MANAGER",
      phone: "+442079460000",
      managerProfile: {
        create: {
          companyName: "Ridgeback Productions",
          displayName: "Sam Patel",
        },
      },
    },
    update: {},
  });

  const rosa = await prisma.user.upsert({
    where: { email: "rosa@example.com" },
    create: {
      email: "rosa@example.com",
      passwordHash: pw,
      role: "MANAGER",
      phone: "+442079460100",
      managerProfile: {
        create: {
          companyName: "North Sound Pictures",
          displayName: "Rosa Clarke",
        },
      },
    },
    update: {},
  });

  // ---- Marshals --------------------------------------------------------
  const marshalSeeds = [
    {
      email: "alex@example.com",
      phone: "+447700900001",
      fullName: "Alex Morgan",
      baseLocation: "Camden, London",
      travelRadiusMiles: 30,
      experienceSummary:
        "6 years location marshal on UK commercials and drama. Calm under traffic pressure, confident with unit base management and public liaison.",
      availability: "ACTIVELY_LOOKING" as const,
      training: "NRSWA chapter 8, first aid at work",
    },
    {
      email: "jordan@example.com",
      phone: "+447700900002",
      fullName: "Jordan Blake",
      baseLocation: "Hackney, London",
      travelRadiusMiles: 20,
      experienceSummary:
        "2 years on independent features. Good with crowd control at unit base and holding traffic for short takes.",
      availability: "OPEN_TO_WORK" as const,
      training: "NRSWA chapter 8",
    },
    {
      email: "priya@example.com",
      phone: "+447700900003",
      fullName: "Priya Lahiri",
      baseLocation: "Chorlton, Manchester",
      travelRadiusMiles: 25,
      experienceSummary:
        "4 years on regional drama and factual shoots. Strong on unit base logistics and local authority liaison.",
      availability: "ACTIVELY_LOOKING" as const,
      training: "NRSWA chapter 8, SIA door supervisor",
    },
    {
      email: "tom@example.com",
      phone: "+447700900004",
      fullName: "Tom Okafor",
      baseLocation: "Walthamstow, London",
      travelRadiusMiles: 15,
      experienceSummary:
        "1 year shadowing senior marshals on commercials. Comfortable with basic traffic and crowd holds.",
      availability: "OPEN_TO_WORK" as const,
      training: "NRSWA chapter 8",
    },
    {
      email: "dani@example.com",
      phone: "+447700900005",
      fullName: "Dani Santos",
      baseLocation: "Brixton, London",
      travelRadiusMiles: 25,
      experienceSummary:
        "7 years on feature films and high-end TV. Lead marshal experience on controlled road closures.",
      availability: "ACTIVELY_LOOKING" as const,
      training: "NRSWA chapter 8, first aid at work, banksman",
    },
    {
      email: "ana@example.com",
      phone: "+447700900006",
      fullName: "Ana Ruiz",
      baseLocation: "Digbeth, Birmingham",
      travelRadiusMiles: 30,
      experienceSummary:
        "3 years on Midlands-based drama productions. Currently on a long booking, not available for new shifts.",
      availability: "UNAVAILABLE" as const,
      training: "NRSWA chapter 8",
    },
  ];

  const marshalUsers = await Promise.all(
    marshalSeeds.map((m) =>
      prisma.user.upsert({
        where: { email: m.email },
        create: {
          email: m.email,
          passwordHash: pw,
          role: "MARSHAL",
          phone: m.phone,
          marshalProfile: {
            create: {
              fullName: m.fullName,
              baseLocation: m.baseLocation,
              travelRadiusMiles: m.travelRadiusMiles,
              experienceSummary: m.experienceSummary,
              availability: m.availability,
              hasTransport: true,
              hasDriversLicence: true,
              training: m.training,
            },
          },
        },
        update: {},
      }),
    ),
  );
  const byEmail = Object.fromEntries(
    marshalUsers.map((u) => [u.email, u] as const),
  );

  // ---- Reset seeded state (rerunnable) --------------------------------
  const managerIds = [sam.id, rosa.id];
  const seededEmails = [
    "manager@example.com",
    "rosa@example.com",
    ...marshalSeeds.map((m) => m.email),
  ];
  await prisma.notification.deleteMany({
    where: { user: { email: { in: seededEmails } } },
  });
  await prisma.application.deleteMany({
    where: { shift: { managerId: { in: managerIds } } },
  });
  await prisma.shift.deleteMany({
    where: { managerId: { in: managerIds } },
  });
  // Reset reliability counts so the COMPLETED shift below can increment from
  // a known base without accumulating across reruns.
  await prisma.marshalProfile.updateMany({
    where: { user: { email: { in: marshalSeeds.map((m) => m.email) } } },
    data: { completedCount: 0, reliableCount: 0 },
  });

  // ---- Helpers ---------------------------------------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return d;
  };
  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => hoursAgo(d * 24);

  // ---- S1: DRAFT (no applications) ------------------------------------
  await prisma.shift.create({
    data: {
      managerId: sam.id,
      productionName: "Netflix pilot \u2014 second unit",
      location: "Greenwich, SE10",
      date: day(14),
      startTime: "07:00",
      endTime: "19:30",
      rate: 15,
      rateUnit: "HOUR",
      duties:
        "Support second unit on exterior location. Keep clear walkways for the public around camera positions.",
      parkingTravel: null,
      experienceNotes: null,
      status: "DRAFT",
    },
  });

  // ---- S2: OPEN with three pending applicants -------------------------
  const s2 = await prisma.shift.create({
    data: {
      managerId: sam.id,
      productionName: "Untitled ITV drama \u2014 unit base",
      location: "Kentish Town, NW5",
      date: day(5),
      startTime: "06:30",
      endTime: "19:00",
      rate: 16.5,
      rateUnit: "HOUR",
      duties:
        "Hold traffic at unit base gate. Direct cast and crew parking. Liaise with locals. Long day, outdoor.",
      parkingTravel: "Free parking at unit base",
      experienceNotes: "Traffic management experience helpful",
      status: "OPEN",
    },
  });
  await prisma.application.createMany({
    data: [
      {
        shiftId: s2.id,
        marshalId: byEmail["alex@example.com"].id,
        status: "APPLIED",
        coverNote:
          "Available for the full day. Happy to arrive on the call time.",
        appliedAt: hoursAgo(28),
      },
      {
        shiftId: s2.id,
        marshalId: byEmail["jordan@example.com"].id,
        status: "APPLIED",
        coverNote:
          "Live 15 minutes from the unit base. Can cover both ends of the day.",
        appliedAt: hoursAgo(20),
      },
      {
        shiftId: s2.id,
        marshalId: byEmail["tom@example.com"].id,
        status: "APPLIED",
        coverNote: null,
        appliedAt: hoursAgo(4),
      },
    ],
  });

  // ---- S3: OPEN with mixed history (two live applicants, one self-withdrawn)
  const s3 = await prisma.shift.create({
    data: {
      managerId: sam.id,
      productionName: "Sky commercial \u2014 shoot day",
      location: "Shoreditch, E1",
      date: day(7),
      startTime: "05:00",
      endTime: "21:00",
      rate: 220,
      rateUnit: "DAY",
      duties:
        "Manage the controlled road closure window. Keep a clear path for cast and equipment movement.",
      parkingTravel: "Nearest tube: Old Street",
      experienceNotes: null,
      status: "OPEN",
    },
  });
  await prisma.application.createMany({
    data: [
      {
        shiftId: s3.id,
        marshalId: byEmail["dani@example.com"].id,
        status: "APPLIED",
        coverNote:
          "Done a few Shoreditch closures. Can liaise with local business if needed.",
        appliedAt: hoursAgo(30),
      },
      {
        shiftId: s3.id,
        marshalId: byEmail["priya@example.com"].id,
        status: "APPLIED",
        coverNote:
          "Travelling down from Manchester the night before, confirmed.",
        appliedAt: hoursAgo(10),
      },
      {
        shiftId: s3.id,
        marshalId: byEmail["alex@example.com"].id,
        status: "WITHDRAWN",
        coverNote: "Happy to step in if needed.",
        appliedAt: hoursAgo(48),
        decidedAt: hoursAgo(36),
      },
    ],
  });

  // ---- S4: FILLED (one ACCEPTED, siblings auto-REJECTED) --------------
  const s4 = await prisma.shift.create({
    data: {
      managerId: sam.id,
      productionName: "BBC drama \u2014 second unit exterior",
      location: "London Fields, E8",
      date: day(10),
      startTime: "06:00",
      endTime: "18:30",
      rate: 17,
      rateUnit: "HOUR",
      duties:
        "Second unit exterior. Hold foot traffic for short takes. Work with the 1st AD on lock-ups.",
      parkingTravel: "Crew parking on Martello Street",
      experienceNotes: "Drama experience preferred",
      status: "OPEN",
    },
  });
  const s4Accepted = await prisma.application.create({
    data: {
      shiftId: s4.id,
      marshalId: byEmail["dani@example.com"].id,
      status: "ACCEPTED",
      coverNote:
        "Done several BBC drama exteriors. Comfortable with crew lock-up pattern.",
      appliedAt: hoursAgo(72),
      decidedAt: hoursAgo(24),
    },
  });
  await prisma.application.createMany({
    data: [
      {
        shiftId: s4.id,
        marshalId: byEmail["jordan@example.com"].id,
        status: "REJECTED",
        coverNote: "Close to the location, can be on site early.",
        appliedAt: hoursAgo(70),
        decidedAt: hoursAgo(24),
      },
      {
        shiftId: s4.id,
        marshalId: byEmail["tom@example.com"].id,
        status: "REJECTED",
        coverNote: null,
        appliedAt: hoursAgo(60),
        decidedAt: hoursAgo(24),
      },
    ],
  });
  await prisma.shift.update({
    where: { id: s4.id },
    data: { status: "FILLED", acceptedApplicationId: s4Accepted.id },
  });

  // ---- S5: COMPLETED (past shift, marshal gets reliability increment) -
  const s5 = await prisma.shift.create({
    data: {
      managerId: sam.id,
      productionName: "Channel 4 factual \u2014 location piece",
      location: "Whitechapel, E1",
      date: day(-14),
      startTime: "07:30",
      endTime: "17:00",
      rate: 200,
      rateUnit: "DAY",
      duties:
        "Support single-camera factual. Light traffic holds and public liaison.",
      parkingTravel: "Nearest tube: Whitechapel",
      experienceNotes: null,
      status: "OPEN",
    },
  });
  const s5Accepted = await prisma.application.create({
    data: {
      shiftId: s5.id,
      marshalId: byEmail["alex@example.com"].id,
      status: "ACCEPTED",
      coverNote: "Happy to cover. I know the area well.",
      appliedAt: daysAgo(21),
      decidedAt: daysAgo(18),
    },
  });
  await prisma.application.createMany({
    data: [
      {
        shiftId: s5.id,
        marshalId: byEmail["jordan@example.com"].id,
        status: "REJECTED",
        coverNote: null,
        appliedAt: daysAgo(21),
        decidedAt: daysAgo(18),
      },
      {
        shiftId: s5.id,
        marshalId: byEmail["priya@example.com"].id,
        status: "REJECTED",
        coverNote: "Can travel down if needed.",
        appliedAt: daysAgo(20),
        decidedAt: daysAgo(18),
      },
    ],
  });
  await prisma.shift.update({
    where: { id: s5.id },
    data: {
      status: "COMPLETED",
      acceptedApplicationId: s5Accepted.id,
      completedAt: daysAgo(13),
      reliabilityFlag: true,
    },
  });
  await prisma.marshalProfile.update({
    where: { userId: byEmail["alex@example.com"].id },
    data: {
      completedCount: { increment: 1 },
      reliableCount: { increment: 1 },
    },
  });

  // ---- S6: CLOSED without hire (Manager 2) ----------------------------
  const s6 = await prisma.shift.create({
    data: {
      managerId: rosa.id,
      productionName: "Independent short \u2014 pulled",
      location: "Peckham, SE15",
      date: day(-6),
      startTime: "08:00",
      endTime: "18:00",
      rate: 15,
      rateUnit: "HOUR",
      duties:
        "Single-camera short film exterior. Light public liaison on a quiet side street.",
      parkingTravel: null,
      experienceNotes: null,
      status: "OPEN",
    },
  });
  await prisma.application.createMany({
    data: [
      {
        shiftId: s6.id,
        marshalId: byEmail["jordan@example.com"].id,
        status: "REJECTED",
        coverNote: "Free that day.",
        appliedAt: daysAgo(9),
        decidedAt: daysAgo(7),
      },
      {
        shiftId: s6.id,
        marshalId: byEmail["tom@example.com"].id,
        status: "REJECTED",
        coverNote: null,
        appliedAt: daysAgo(8),
        decidedAt: daysAgo(7),
      },
    ],
  });
  await prisma.shift.update({
    where: { id: s6.id },
    data: { status: "CLOSED" },
  });

  // ---- S7: OPEN, reopened after accepted marshal withdrew (Manager 2)
  // Mirrors the live withdraw-from-ACCEPTED flow: the previous acceptee is
  // WITHDRAWN, the shift is back to OPEN with no acceptedApplicationId, and a
  // fresh applicant has come in after the reopen.
  const s7 = await prisma.shift.create({
    data: {
      managerId: rosa.id,
      productionName: "Regional drama pickup \u2014 reopened",
      location: "Bow, E3",
      date: day(6),
      startTime: "06:30",
      endTime: "19:00",
      rate: 210,
      rateUnit: "DAY",
      duties:
        "Unit base gate. Direct crew parking and hold public traffic while the camera truck exits.",
      parkingTravel: "Crew parking on site",
      experienceNotes: null,
      status: "OPEN",
    },
  });
  await prisma.application.createMany({
    data: [
      {
        shiftId: s7.id,
        marshalId: byEmail["priya@example.com"].id,
        status: "WITHDRAWN",
        coverNote: "Originally confirmed; travel plans changed last minute.",
        appliedAt: daysAgo(4),
        decidedAt: daysAgo(1),
      },
      {
        shiftId: s7.id,
        marshalId: byEmail["alex@example.com"].id,
        status: "APPLIED",
        coverNote: "Saw this reopened, can cover.",
        appliedAt: hoursAgo(12),
      },
    ],
  });

  // ---- S8: DRAFT (Manager 2) ------------------------------------------
  await prisma.shift.create({
    data: {
      managerId: rosa.id,
      productionName: "Draft: period drama \u2014 location TBC",
      location: "TBC, Central London",
      date: day(21),
      startTime: "07:00",
      endTime: "19:00",
      rate: 18,
      rateUnit: "HOUR",
      duties:
        "Brief pending location confirmation. Full duties will be shared before opening applications.",
      parkingTravel: null,
      experienceNotes: null,
      status: "DRAFT",
    },
  });

  // ---- Summary ---------------------------------------------------------
  const seededShifts = await prisma.shift.findMany({
    where: { managerId: { in: managerIds } },
    select: { status: true },
  });
  const seededApps = await prisma.application.findMany({
    where: { shift: { managerId: { in: managerIds } } },
    select: { status: true },
  });
  const tally = (rows: { status: string }[]) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

  console.log("Seeded.");
  console.log("  Founder:");
  console.log(
    "    admin@marshalhq.com / password123  (matches FOUNDER_EMAILS in .env)",
  );
  console.log("  Managers:");
  console.log(
    "    manager@example.com / password123  (Sam Patel, Ridgeback Productions)",
  );
  console.log(
    "    rosa@example.com    / password123  (Rosa Clarke, North Sound Pictures)",
  );
  console.log("  Marshals:");
  for (const m of marshalSeeds) {
    console.log(
      `    ${m.email.padEnd(19)} / password123  (${m.fullName}, ${m.availability})`,
    );
  }
  console.log("  Shifts by status:      ", tally(seededShifts));
  console.log("  Applications by status:", tally(seededApps));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
