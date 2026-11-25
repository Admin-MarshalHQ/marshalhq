// Run in a disposable local PostgreSQL database after applying the Prisma schema.
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const { PrismaClient } = require("@prisma/client");

test("real booking actions serialise decisions and credit each worker once", async (t) => {
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/setru_qa$/);
  const db = new PrismaClient();
  globalThis.__prisma = db;
  // This suite races different vacancies concurrently. Their release permissions
  // are exercised independently against PostgreSQL in vacancy-release.test.cjs.
  const clearance = require("../lib/vacancy-brief.ts");
  require.cache[require.resolve("../lib/vacancy-brief.ts")].exports = { ...clearance, clearedFor: () => true };
  require.cache[require.resolve("../lib/manager-application-access.ts")] = { exports: { managerApplicationAccess: async managerId => ({ shift: { managerId } }) } };
  const actor = new AsyncLocalStorage();
  const authModule = require.resolve("../lib/auth.ts");
  require.cache[authModule] = { exports: { auth: async () => ({ user: actor.getStore() }) } };
  t.mock.method(require("next/cache"), "revalidatePath", () => {});
  delete process.env.RESEND_API_KEY;
  t.after(() => db.$disconnect());
  const { acceptApplicationAction: accept, rejectApplicationAction: reject } = require("../app/actions/hiring.ts");
  const { completeShiftAction: finish, reopenAfterDropoutAction: dropout,
    resolveAttendanceAction: resolve, closeShiftAction: close } = require("../app/actions/shifts.ts");

  const tag = randomUUID();
  async function person(role, name) {
    return db.user.create({ data: {
      email: `${name}-${tag}@example.com`, passwordHash: "unused", emailVerifiedAt: new Date(), role,
      ...(role === "MARSHAL" && { marshalProfile: { create: { fullName: name, baseLocation: "London",
        travelRadiusMiles: 12, experienceSummary: "Synthetic location work" } } }),
    } });
  }
  const manager = await person("MANAGER","manager");
  const [a,b,c] = await Promise.all(["a","b","c"].map(name => person("MARSHAL",name)));
  const outsider = await person("MANAGER","outside");
  process.env.PILOT_PARTICIPANT_EMAILS = [manager,a,b,c].map(x => x.email).join(",");
  await require("./pilot-agreement-fixture.cjs").seedAgreements(db, manager, [a,b,c]);
  const founder = { ...await person("MANAGER","founder"), founderPasscode: true, founderIssuedAt: Date.now() };
  process.env.FOUNDER_EMAILS = founder.email;
  const future = new Date("2099-04-01"); const past = new Date("2020-04-01");
  async function shift(places, people, day = future) {
    const s = await db.shift.create({ data: {
      managerId: manager.id, productionName: tag, location: "QA", duties: "QA", startDate: day,
      endDate: day, dailyStartTime:"07:00",dailyEndTime:"18:00",rate:20,status:"OPEN",marshalsNeeded:places,
    } });
    const apps = await Promise.all(people.map(p => db.application.create({data:{shiftId:s.id,marshalId:p.id,termsVersion:clearance.briefVersion(s)}})));
    return {id:s.id,apps};
  }
  async function invoke(user, fn, ...args) {
    try { await actor.run(user, () => fn(...args)); }
    catch (e) { if (e.digest?.startsWith("NEXT_REDIRECT;")) return e.digest; throw e; }
    throw new Error("Expected action redirect");
  }
  const first = await shift(2,[a,b,c]);
  assert.match(await invoke(outsider,accept,first.apps[0].id),/pilot-access/);
  const attempts = await Promise.all(first.apps.map(app => invoke(manager,accept,app.id)));
  assert.equal(attempts.filter(x => x.includes("/booking;")).length,2);
  const booked = await db.application.findMany({where:{shiftId:first.id,status:"ACCEPTED"},orderBy:{decidedAt:"asc"}});
  assert.equal(booked.length,2);
  assert.equal((await db.shift.findUniqueOrThrow({where:{id:first.id}})).status,"FILLED");
  assert.match(await invoke(manager,close,first.id,"OPEN",[]),/close=stale/);
  assert.match(await invoke(manager,close,first.id,"FILLED",[booked[1].id]),/close=stale/);
  assert.equal(await db.application.count({where:{shiftId:first.id,status:"ACCEPTED"}}),2);
  const overlap = await shift(1,[{id:booked[0].marshalId}]);
  assert.match(await invoke(manager,accept,overlap.apps[0].id),/conflict/);
  const elapsed = await shift(1,[c],past);
  assert.match(await invoke(manager,accept,elapsed.apps[0].id),/stale/);
  await invoke(manager,dropout,first.id,booked[0].id);
  assert.equal((await db.application.findUniqueOrThrow({where:{id:booked[0].id}})).status,"WITHDRAWN");
  assert.equal((await db.application.findUniqueOrThrow({where:{id:booked[1].id}})).status,"ACCEPTED");
  await db.shift.update({where:{id:first.id},data:{startDate:past,endDate:past}});
  const attendance = new FormData(); attendance.set(booked[1].id,"UNRESOLVED");
  await invoke(manager,finish,first.id,attendance);
  assert.equal(await db.application.count({ where: { shiftId: first.id, status: "APPLIED" } }), 0);
  const unsuccessful = await db.application.findFirstOrThrow({ where: { shiftId: first.id, status: "REJECTED" } });
  assert.ok(unsuccessful.decidedAt);
  assert.equal(await db.notification.count({ where: { userId: unsuccessful.marshalId, subject: `Shift completed: ${tag}` } }), 1);
  const profile = () => db.marshalProfile.findUniqueOrThrow({where:{userId:booked[1].marshalId}});
  assert.equal((await profile()).completedCount,0);
  attendance.set(booked[1].id,"WORKED");
  attendance.set("previous","UNRESOLVED");
  attendance.set("reason","Synthetic confirmation");
  attendance.set("applicationId",booked[1].id);
  await Promise.all([invoke(founder,resolve,first.id,attendance),invoke(founder,resolve,first.id,attendance)]);
  assert.equal((await profile()).completedCount,1);
  const second = await shift(2,[a,b]);
  await Promise.all(second.apps.map(app => invoke(manager,accept,app.id)));
  await db.shift.update({where:{id:second.id},data:{startDate:past,endDate:past}});
  const mixed = new FormData();
  mixed.set(second.apps[0].id,"WORKED_FLAGGED"); mixed.set(second.apps[1].id,"NOT_WORKED");
  const before = await Promise.all([a,b].map(p=>db.marshalProfile.findUniqueOrThrow({where:{userId:p.id}})));
  await Promise.all([invoke(manager,finish,second.id,mixed),invoke(manager,finish,second.id,mixed)]);
  const after = await Promise.all([a,b].map(p=>db.marshalProfile.findUniqueOrThrow({where:{userId:p.id}})));
  assert.deepEqual(after.map((p,i)=>p.completedCount-before[i].completedCount),[1,0]);
  assert.deepEqual(after.map((p,i)=>p.reliableCount-before[i].reliableCount),[0,0]);
  // A challenge may concern attendance or feedback alone. Preserve the sibling
  // and any historical rows; derive visibility from the booked individual's state.
  const { recordedReviews } = require("../lib/recorded-reviews.ts");
  const { confirmedWork } = require("../lib/attendance.ts");
  const pair = await shift(2, [a, b], past);
  await db.application.updateMany({ where: { shiftId: pair.id }, data: { status: "ACCEPTED" } });
  await db.shift.update({ where: { id: pair.id }, data: { status: "COMPLETED" } });
  const count = who => db.application.count({ where: { marshalId: who.id, ...confirmedWork } });
  const beforePair = await Promise.all([count(a), count(b)]);
  assert.equal(await db.application.count({ where: { ...confirmedWork, shiftId: pair.id } }), 0);
  await db.application.updateMany({ where: { shiftId: pair.id }, data: { attendance: "WORKED" } });
  for (const person of [a, b]) {
    await db.review.create({ data: { shiftId: pair.id, authorId: person.id, subjectId: manager.id,
      direction: "MARSHAL_ON_MANAGER", rating: person.id === a.id ? 2 : 5 } });
  }
  const correction = new FormData();
  correction.set("applicationId", pair.apps[0].id);
  correction.set("reason", "Synthetic correction case");
  for (const [previous, next, credit] of [["WORKED", "WORKED_FLAGGED", 1],
    ["WORKED_FLAGGED", "UNRESOLVED", 0], ["UNRESOLVED", "NOT_WORKED", 0]]) {
    correction.set("previous", previous);
    correction.set(pair.apps[0].id, next);
    await invoke(founder, resolve, pair.id, correction);
    assert.match(await invoke(founder, resolve, pair.id, correction), /attendance=stale/);
    assert.equal(await count(a), beforePair[0] + credit);
    assert.equal(await count(b), beforePair[1] + 1);
    const visible = (await recordedReviews(manager.id, "MARSHAL_ON_MANAGER")).filter(review => review.shiftId === pair.id);
    assert.deepEqual(visible.map(review => review.authorId), [b.id]);
  }
  assert.equal(await db.review.count({ where: { shiftId: pair.id } }), 2);
  assert.equal(await db.attendanceChange.count({ where: { applicationId: pair.apps[0].id } }), 3);

  const cancelled = await shift(2, [a, b]);
  await invoke(manager, accept, cancelled.apps[0].id);
  await invoke(manager, close, cancelled.id, "OPEN", [cancelled.apps[0].id]);
  const closed = await db.application.findMany({ where: { shiftId: cancelled.id }, orderBy: { marshalId: "asc" } });
  assert.equal(closed.find(row => row.marshalId === a.id).status, "PRODUCTION_CANCELLED");
  assert.equal(closed.find(row => row.marshalId === b.id).status, "REJECTED");
  assert.ok(closed.every(row => row.attendance === null));
  const sameMarshal = await Promise.all([shift(1,[a]),shift(1,[a])]);
  const simultaneous = await Promise.all(sameMarshal.map(s => invoke(manager,accept,s.apps[0].id)));
  assert.equal(simultaneous.filter(result => result.includes("/booking;")).length,1);
  const race = await shift(1,[c]);
  await Promise.all([invoke(manager,accept,race.apps[0].id),invoke(manager,reject,race.apps[0].id)]);
  const final = await db.application.findUniqueOrThrow({where:{id:race.apps[0].id}});
  const status = (await db.shift.findUniqueOrThrow({where:{id:race.id}})).status;
  assert.ok((final.status==="ACCEPTED" && status==="FILLED") || (final.status==="REJECTED" && status==="OPEN"));
});
