const test = require("node:test");
const assert = require("node:assert/strict");

test("manager cancellation honours final wrap and preserves attendance", async (t) => {
  let snapshot;
  let writes;
  const tx = {
    $queryRaw: async () => { writes.push("lock"); },
    shift: {
      findUniqueOrThrow: async () => snapshot.current,
      update: async ({ data }) => { writes.push(data.status); },
    },
    application: {
      findMany: async ({ where }) => where.status === "ACCEPTED" ? snapshot.accepted : snapshot.pending,
      updateMany: async ({ data }) => { writes.push(data.status); },
    },
    notification: { create: async ({ data }) => { writes.push(data.kind); } },
  };
  globalThis.__prisma = {
    shift: { findUnique: async () => snapshot.rendered },
    $transaction: async (callback) => callback(tx),
  };
  require.cache[require.resolve("../lib/access.ts")] = { exports: { requireRole: async () => ({ id: "manager-1" }) } };
  require.cache[require.resolve("../lib/notify.ts")] = { exports: { flushNotificationEmails: async (queue) => {
    if (queue.length) writes.push("dispatch");
  } } };
  t.mock.method(require("next/cache"), "revalidatePath", () => {});
  const { closeShiftAction } = require("../app/actions/shifts.ts");

  async function run(status, endDate, booked) {
    writes = [];
    const rendered = { managerId: "manager-1", status, productionName: "Example", endDate: new Date("2098-02-01"), dailyEndTime: "18:00" };
    snapshot = { rendered, current: { ...rendered, endDate: new Date(endDate) },
      accepted: booked ? [{ id: "booking", marshalId: "marshal-1" }] : [],
      pending: [{ id: "pending", marshalId: "marshal-2" }],
    };
    await assert.rejects(closeShiftAction("shift", status, booked ? ["booking"] : []), (error) => {
      const pathname = booked && endDate === "2025-02-01" ? "/manager/shifts/shift?close=attendance" : "/manager/shifts/shift";
      assert.equal(error.digest?.split(";")[2], pathname);
      return true;
    });
    return writes;
  }
  for (const status of ["OPEN", "FILLED"]) {
    // The roster still matches the confirmation, but the locked snapshot has wrapped.
    assert.deepEqual(await run(status, "2025-02-01", true), ["lock"]);
    assert.deepEqual(await run(status, "2098-02-01", true),
      ["lock", "REJECTED", "WITHDRAWN", "CLOSED", "APPLICATION_REJECTED", "SHIFT_STATUS_CHANGED", "dispatch"]);
  }
  assert.deepEqual(await run("OPEN", "2025-02-01", false),
    ["lock", "REJECTED", "CLOSED", "APPLICATION_REJECTED", "dispatch"]);
});
