import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assert(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  const filled = await prisma.shift.findFirst({
    where: { status: "FILLED", applications: { some: { status: "ACCEPTED" } } },
    include: { applications: { where: { status: "ACCEPTED" } } },
  });
  if (!filled) {
    console.log("No FILLED shift with accepted applications found.");
    return;
  }

  const acceptedIds = filled.applications.map((a) => a.id);
  await prisma.$transaction(async (tx) => {
    await tx.application.updateMany({
      where: { shiftId: filled.id, status: "ACCEPTED" },
      data: { status: "WITHDRAWN", decidedAt: new Date() },
    });
    await tx.shift.update({
      where: { id: filled.id },
      data: { status: "CLOSED" },
    });
  });

  const after = await prisma.shift.findUnique({
    where: { id: filled.id },
    include: {
      applications: { where: { id: { in: acceptedIds } } },
    },
  });
  assert("shift is closed after cancellation", after?.status === "CLOSED");
  assert(
    "accepted applications become withdrawn",
    after?.applications.every((a) => a.status === "WITHDRAWN") ?? false,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
