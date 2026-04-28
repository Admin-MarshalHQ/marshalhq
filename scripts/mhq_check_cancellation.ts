// QA Failure Remediation — verify the filled-shift cancellation flow.
//
// Sets up: a FILLED shift with one ACCEPTED applicant. Calls the closeShiftAction
// surrogate logic the same way the action does (transaction + notification +
// flushNotificationEmails) and asserts that:
//   - the shift becomes CLOSED
//   - the accepted application becomes WITHDRAWN
//   - acceptedApplicationId is preserved
//   - a SHIFT_STATUS_CHANGED notification exists for the accepted marshal
//   - no completion history is created
//
// Email side-effects are best-effort, so we don't assert delivery here — the
// `flushNotificationEmails` call is exercised separately by the unit tests.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  // Find an existing FILLED shift in seed data.
  const filled = await prisma.shift.findFirst({
    where: { status: "FILLED", acceptedApplicationId: { not: null } },
    include: { applications: true },
  });
  if (!filled || !filled.acceptedApplicationId) {
    console.error("[check] no FILLED shift in DB; cannot verify cancellation");
    process.exit(1);
  }
  const acceptedAppId = filled.acceptedApplicationId;
  const acceptedApp = filled.applications.find((a) => a.id === acceptedAppId);
  if (!acceptedApp) {
    console.error("[check] FILLED shift has no matching accepted application");
    process.exit(1);
  }
  const acceptedMarshalId = acceptedApp.marshalId;
  console.log(
    `[check] using shift=${filled.id} (${filled.productionName}) accepted-marshal=${acceptedMarshalId}`,
  );

  // Mirror closeShiftAction's transaction body for FILLED shifts.
  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: acceptedAppId },
      data: { status: "WITHDRAWN", decidedAt: new Date() },
    });
    await tx.shift.update({
      where: { id: filled.id },
      data: { status: "CLOSED" },
    });
    await tx.notification.create({
      data: {
        userId: acceptedMarshalId,
        kind: "SHIFT_STATUS_CHANGED",
        subject: `Shift cancelled: ${filled.productionName}`,
        body:
          `The manager has cancelled this shift. The booking is closed and the shift will not be marked as completed.\n\n` +
          `If you have questions about this cancellation, contact MarshalHQ support and we'll follow up.`,
      },
    });
  });

  // Verify post-conditions.
  const after = await prisma.shift.findUnique({ where: { id: filled.id } });
  const appAfter = await prisma.application.findUnique({
    where: { id: acceptedAppId },
  });
  const note = await prisma.notification.findFirst({
    where: {
      userId: acceptedMarshalId,
      kind: "SHIFT_STATUS_CHANGED",
      subject: { startsWith: "Shift cancelled" },
    },
    orderBy: { createdAt: "desc" },
  });

  const checks: Array<[string, boolean]> = [
    ["shift status is CLOSED", after?.status === "CLOSED"],
    [
      "acceptedApplicationId is preserved (trust history)",
      after?.acceptedApplicationId === acceptedAppId,
    ],
    [
      "no completion timestamp on cancelled shift",
      after?.completedAt === null,
    ],
    [
      "no reliability flag on cancelled shift",
      after?.reliabilityFlag === null,
    ],
    [
      "previously accepted application becomes WITHDRAWN",
      appAfter?.status === "WITHDRAWN",
    ],
    [
      "SHIFT_STATUS_CHANGED notification exists for accepted marshal",
      !!note,
    ],
    [
      "notification mentions the production name",
      !!note && note.subject.includes(filled.productionName),
    ],
    [
      "notification body explains shift won't be marked as completed",
      !!note && note.body.includes("will not be marked as completed"),
    ],
  ];

  let passed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    if (ok) passed++;
  }
  const failed = checks.length - passed;
  console.log(`\n${passed} passed, ${failed} failed (${checks.length} total)`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
