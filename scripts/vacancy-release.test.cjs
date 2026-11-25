const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");

test("one scoped vacancy, individual stages and durable brief across a hold", async (t) => {
  for (const value of [process.env.DATABASE_URL, process.env.POSTGRES_URL]) {
    assert.equal(new URL(value).hostname, "127.0.0.1");
    assert.equal(new URL(value).pathname, "/setru_qa");
  }
  const db = new (require("@prisma/client").PrismaClient)();
  const session = new AsyncLocalStorage();
  globalThis.__prisma = db;
  t.after(() => db.$disconnect());
  require.cache[require.resolve("../lib/auth.ts")] = {
    exports: { auth: async () => ({ user: session.getStore() }) },
  };
  t.mock.method(require("next/cache"), "revalidatePath", () => {});
  delete process.env.RESEND_API_KEY;
  const {
    briefVersion,
    applicationNoticeVersion,
    clearedFor,
  } = require("../lib/vacancy-brief.ts");
  const { recordVacancyRelease } = require("../app/actions/vacancy-release.ts");
  const { publishShiftAction } = require("../app/actions/shifts.ts");
  const {
    applyToShiftAction,
    acceptApplicationAction,
  } = require("../app/actions/hiring.ts");
  const tag = randomUUID();
  async function user(role, name) {
    return db.user.create({
      data: {
        role,
        email: name + "-" + tag + "@example.invalid",
        passwordHash: "fixture",
        emailVerifiedAt: new Date(),
        ...(role === "MARSHAL" && {
          marshalProfile: {
            create: {
              fullName: name,
              baseLocation: "Synthetic town",
              experienceSummary: "Synthetic marshal work",
              travelRadiusMiles: 10,
            },
          },
        }),
      },
    });
  }
  const [manager, marshal, other, operator] = await Promise.all([
    user("MANAGER", "hirer"),
    user("MARSHAL", "permitted"),
    user("MARSHAL", "other"),
    user("MANAGER", "operator"),
  ]);
  process.env.FOUNDER_EMAILS = operator.email;
  process.env.PILOT_MANAGER_EMAILS = manager.email;
  process.env.PILOT_MARSHAL_EMAILS = [marshal.email, other.email].join(",");
  const founder = {
    ...operator,
    founderPasscode: true,
    founderIssuedAt: Date.now(),
  };
  const data = {
    managerId: manager.id,
    productionName: "Synthetic unit",
    location: "Fixture site",
    duties: "Guide arrivals",
    engagementTerms:
      "Fixture Hirer directly employs and supervises. Daily pay covers 8 hours with paid break, no extra expenses. Payment weekly. Wet ground: use marked walkway. Cancellation by agreement.",
    startDate: new Date("2099-11-21"),
    endDate: new Date("2099-11-22"),
    dailyStartTime: "20:00",
    dailyEndTime: "04:00",
    marshalsNeeded: 2,
    rate: 150,
    rateUnit: "DAY",
  };
  const [shift, second] = await Promise.all([
    db.shift.create({ data }),
    db.shift.create({ data }),
  ]);
  t.after(async () => {
    await db.shift.deleteMany({ where: { id: { in: [shift.id, second.id] } } });
    await db.user.deleteMany({
      where: { id: { in: [manager.id, marshal.id, other.id, operator.id] } },
    });
  });
  async function act(who, fn, ...params) {
    try {
      return await session.run(who, () => fn(...params));
    } catch (e) {
      if (e.digest?.startsWith("NEXT_REDIRECT;")) return e.digest.split(";")[2];
      throw e;
    }
  }
  const form = (fields) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  };
  const version = briefVersion(shift);
  const fields = {
    decision: "release",
    expiresAt: "2099-11-20T00:00:00Z",
    evidenceRef: "Synthetic-only",
    viewers: marshal.id,
  };
  const release = () =>
    db.vacancyRelease.findUnique({ where: { activeSlot: "GB-pilot" } });
  const action = (
    person,
    p = shift,
    rev = version,
    notice = applicationNoticeVersion,
  ) =>
    act(
      person,
      applyToShiftAction,
      null,
      form({ shiftId: p.id, briefVersion: rev, noticeVersion: notice }),
    );
  assert.match(
    await act(
      manager,
      publishShiftAction,
      shift.id,
      shift.updatedAt.toISOString(),
    ),
    /clearance/,
  );
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      shift.id,
      version,
      "",
      form({ ...fields, applicants: other.id }),
    ),
    /invalid/,
  );
  assert.match(
    await act(
      manager,
      recordVacancyRelease,
      shift.id,
      version,
      "",
      form(fields),
    ),
    /^\/$/,
  );
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      shift.id,
      version,
      "",
      form(fields),
    ),
    /saved/,
  );
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      second.id,
      briefVersion(second),
      "",
      form(fields),
    ),
    /occupied/,
  );
  let current = await release();
  assert(clearedFor(shift, current, "view", marshal.id));
  assert(!clearedFor(shift, current, "view", other.id));
  assert(!clearedFor({ ...shift, rate: 155 }, current, "view", marshal.id));
  assert(
    !clearedFor(
      shift,
      current,
      "view",
      marshal.id,
      new Date("2099-11-20T00:00:00Z"),
    ),
  );
  assert.equal(
    await act(
      manager,
      publishShiftAction,
      shift.id,
      shift.updatedAt.toISOString(),
    ),
    "/manager/shifts/" + shift.id,
  );
  assert.match((await action(marshal)).error, /not been cleared/);
  assert.match((await action(other)).error, /not been cleared/);
  assert.equal(await db.application.count({ where: { shiftId: shift.id } }), 0);
  assert.equal(
    await db.notification.count({ where: { userId: manager.id } }),
    0,
  );
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      shift.id,
      version,
      current.id,
      form({ ...fields, applicants: marshal.id }),
    ),
    /saved/,
  );
  assert.match((await action(marshal, shift, "old")).error, /current brief/);
  assert.match(
    (await action(marshal, shift, version, "old")).error,
    /current brief/,
  );
  assert.match(await action(marshal), /applied=1/);
  const booking = await db.application.findFirstOrThrow({
    where: { shiftId: shift.id },
  });
  const {
    managerApplicationAccess,
  } = require("../lib/manager-application-access.ts");
  const applicants = async (where) =>
    db.application.findMany({ where, select: { id: true } });
  const staleRead = await managerApplicationAccess(manager.id);
  assert.equal((await applicants(staleRead)).length, 1);
  const beforeHold = await release();
  await act(
    founder,
    recordVacancyRelease,
    shift.id,
    version,
    beforeHold.id,
    form({ decision: "hold" }),
  );
  assert.deepEqual(await applicants(staleRead), []);
  assert.deepEqual(
    await applicants(await managerApplicationAccess(manager.id)),
    [],
  );
  await act(
    founder,
    recordVacancyRelease,
    shift.id,
    version,
    "",
    form({ ...fields, applicants: marshal.id }),
  );
  assert.equal(booking.appliedBrief.engagementTerms, data.engagementTerms);
  assert.equal(booking.termsVersion, version);
  assert.equal(booking.noticeVersion, applicationNoticeVersion);
  assert.match(
    await act(manager, acceptApplicationAction, booking.id),
    /stale/,
  );
  const outdated = current;
  current = await release();
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      shift.id,
      version,
      outdated.id,
      form({ decision: "hold" }),
    ),
    /changed/,
  );
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      shift.id,
      version,
      current.id,
      form({ ...fields, applicants: marshal.id, bookable: marshal.id }),
    ),
    /saved/,
  );
  assert.match(
    await act(manager, acceptApplicationAction, booking.id),
    /booking/,
  );
  current = await release();
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      shift.id,
      version,
      current.id,
      form({ decision: "hold" }),
    ),
    /held/,
  );
  assert.equal(await release(), null);
  assert.match(
    await act(
      founder,
      recordVacancyRelease,
      second.id,
      briefVersion(second),
      "",
      form(fields),
    ),
    /roster/,
  );
  assert.equal(
    (await db.application.findUniqueOrThrow({ where: { id: booking.id } }))
      .status,
    "ACCEPTED",
  );
  assert.equal(
    await db.vacancyRelease.count({
      where: { shiftId: shift.id, retiredBy: founder.id },
    }),
    4,
  );
  assert.equal(
    (await applicants(await managerApplicationAccess(manager.id))).length,
    1,
  );
});
