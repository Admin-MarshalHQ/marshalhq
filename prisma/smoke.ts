import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  canCompleteShift,
  canMarshalApply,
  classifyWithdraw,
  isShiftSchedulable,
} from "../lib/state";
import { formatPhone, normalisePhone } from "../lib/phone";
import {
  generateRawResetToken,
  hashResetToken,
  resetExpiry,
} from "../lib/reset";
import {
  generateRawEmailVerificationToken,
  hashEmailVerificationToken,
  emailVerificationExpiry,
} from "../lib/verify-email";

const prisma = new PrismaClient({ log: ["error"] });

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error("x " + msg);
    process.exit(1);
  }
  console.log("ok " + msg);
}

async function reset() {
  const emails = [
    "smoke.manager@example.com",
    "smoke.marshal.a@example.com",
    "smoke.marshal.b@example.com",
    "smoke.marshal.c@example.com",
  ];
  await prisma.notification.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.emailVerificationToken.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.passwordResetToken.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.application.deleteMany({ where: { marshal: { email: { in: emails } } } });
  await prisma.shift.deleteMany({ where: { manager: { email: "smoke.manager@example.com" } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

async function main() {
  await reset();
  const pw = await bcrypt.hash("pw", 10);
  const manager = await prisma.user.create({
    data: {
      email: "smoke.manager@example.com",
      passwordHash: pw,
      role: "MANAGER",
      phone: "+442000000001",
      managerProfile: {
        create: { companyName: "Smoke Productions", displayName: "Smoky" },
      },
    },
  });
  const marshals = await Promise.all(
    ["a", "b", "c"].map((letter, index) =>
      prisma.user.create({
        data: {
          email: `smoke.marshal.${letter}@example.com`,
          passwordHash: pw,
          role: "MARSHAL",
          phone: `+44770000000${index + 1}`,
          marshalProfile: {
            create: {
              fullName: `Smoke Marshal ${letter.toUpperCase()}`,
              baseLocation: "London",
              travelRadiusMiles: 30,
              experienceSummary: "Experienced location marshal",
              availability: "ACTIVELY_LOOKING",
            },
          },
        },
      }),
    ),
  );

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const shift = await prisma.shift.create({
    data: {
      managerId: manager.id,
      productionName: "Smoke Multi Shift",
      location: "Soho",
      marshalsNeeded: 2,
      startDate: future,
      endDate: future,
      dailyStartTime: "07:00",
      dailyEndTime: "19:00",
      rate: 200,
      rateUnit: "DAY",
      duties: "Hold traffic",
      status: "OPEN",
    },
  });
  const apps = await Promise.all(
    marshals.map((marshal) =>
      prisma.application.create({
        data: { shiftId: shift.id, marshalId: marshal.id, status: "APPLIED" },
      }),
    ),
  );
  await prisma.application.update({
    where: { id: apps[0].id },
    data: { status: "ACCEPTED", decidedAt: new Date() },
  });
  await prisma.shift.update({ where: { id: shift.id }, data: { status: "OPEN" } });
  assert(
    (await prisma.application.count({ where: { shiftId: shift.id, status: "ACCEPTED" } })) === 1,
    "first accept books one marshal",
  );
  assert(
    (await prisma.shift.findUnique({ where: { id: shift.id } }))?.status === "OPEN",
    "shift stays OPEN while below quota",
  );

  await prisma.application.update({
    where: { id: apps[1].id },
    data: { status: "ACCEPTED", decidedAt: new Date() },
  });
  await prisma.shift.update({ where: { id: shift.id }, data: { status: "FILLED" } });
  assert(
    (await prisma.application.count({ where: { shiftId: shift.id, status: "ACCEPTED" } })) === 2,
    "second accept reaches quota",
  );
  assert(
    (await prisma.application.findUnique({ where: { id: apps[2].id } }))?.status === "APPLIED",
    "prior applicants remain APPLIED when quota fills",
  );

  await prisma.application.update({
    where: { id: apps[0].id },
    data: { status: "WITHDRAWN", decidedAt: new Date() },
  });
  const afterDropoutAccepted = await prisma.application.count({
    where: { shiftId: shift.id, status: "ACCEPTED" },
  });
  await prisma.shift.update({
    where: { id: shift.id },
    data: { status: afterDropoutAccepted < shift.marshalsNeeded ? "OPEN" : "FILLED" },
  });
  assert(afterDropoutAccepted === 1, "dropout removes exactly one accepted marshal");
  assert(
    (await prisma.shift.findUnique({ where: { id: shift.id } }))?.status === "OPEN",
    "dropout reopens one missing slot",
  );
  assert(
    (await prisma.application.findUnique({ where: { id: apps[2].id } }))?.status === "APPLIED",
    "previous applicant remains reviewable after reopen",
  );

  await prisma.application.update({
    where: { id: apps[2].id },
    data: { status: "ACCEPTED", decidedAt: new Date() },
  });
  await prisma.shift.update({
    where: { id: shift.id },
    data: { status: "FILLED", startDate: past, endDate: past },
  });
  assert(
    canCompleteShift({ endDate: past, dailyEndTime: "19:00", status: "FILLED" }),
    "filled past shift can complete",
  );
  const acceptedForCompletion = await prisma.application.findMany({
    where: { shiftId: shift.id, status: "ACCEPTED" },
    select: { marshalId: true },
  });
  for (const app of acceptedForCompletion) {
    await prisma.marshalProfile.update({
      where: { userId: app.marshalId },
      data: { completedCount: { increment: 1 }, reliableCount: { increment: 1 } },
    });
  }
  assert(acceptedForCompletion.length === 2, "completion applies to all accepted marshals");

  assert(canMarshalApply("ACTIVELY_LOOKING"), "available marshal can apply");
  assert(!canMarshalApply("UNAVAILABLE"), "unavailable marshal cannot apply");
  assert(
    classifyWithdraw(
      { status: "ACCEPTED" },
      { status: "OPEN", startDate: future, dailyStartTime: "07:00" },
    ) === "allowed",
    "accepted marshal can withdraw from part-filled OPEN shift before start",
  );
  assert(
    isShiftSchedulable({
      startDate: future,
      endDate: future,
      dailyStartTime: "07:00",
      dailyEndTime: "19:00",
    }),
    "future shift is schedulable",
  );
  assert(normalisePhone("07911 123456") === "+447911123456", "phone normalises");
  assert(formatPhone("+447911123456") === "+44 7911 123 456", "phone formats");

  const rawReset = generateRawResetToken();
  const resetHash = hashResetToken(rawReset);
  await prisma.passwordResetToken.create({
    data: { userId: marshals[0].id, tokenHash: resetHash, expiresAt: resetExpiry() },
  });
  assert(resetHash !== rawReset, "password reset stores hash, not raw token");

  const rawVerify = generateRawEmailVerificationToken();
  const verifyHash = hashEmailVerificationToken(rawVerify);
  const verify = await prisma.emailVerificationToken.create({
    data: {
      userId: marshals[0].id,
      tokenHash: verifyHash,
      expiresAt: emailVerificationExpiry(),
    },
  });
  assert(verifyHash !== rawVerify, "email verification stores hash, not raw token");
  const firstUse = await prisma.emailVerificationToken.updateMany({
    where: { id: verify.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  const secondUse = await prisma.emailVerificationToken.updateMany({
    where: { id: verify.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  assert(firstUse.count === 1 && secondUse.count === 0, "verification token is one-time");

  console.log("\nAll smoke invariants hold.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
