const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");

test("pilot scheduling, attendance and application cutoffs", () => {
  const { validShiftWindow, shiftStartDateTime, classifyWithdraw } = require("../lib/state.ts");
  const { ShiftDraftSchema } = require("../lib/zod.ts");
  const { actionableApplicantCount } = require("../lib/workspace-shifts.ts");
  const { marshalApplicationOutcome } = require("../lib/application-outcome.ts");
  const { formatDate } = require("../lib/format.ts");
  const spring = new Date("2027-03-28"), autumn = new Date("2027-10-31");
  assert.equal(validShiftWindow(spring, spring, "01:30", "02:30"), false);
  assert.equal(validShiftWindow(spring, spring, "00:30", "01:30"), false);
  assert.equal(validShiftWindow(autumn, autumn, "01:30", "02:30"), true);
  assert.equal(shiftStartDateTime(autumn, "01:30").toISOString(), "2027-10-31T00:30:00.000Z");
  const date = new Date("2027-06-01");
  const shift = { startDate: date, endDate: date, dailyStartTime: "00:30", dailyEndTime: "08:00", paused: false,
    status: "OPEN", pendingCount: 2, bookedCount: 0, marshalsNeeded: 1 };
  const call = shiftStartDateTime(date, "00:30");
  assert.match(formatDate(call), /Tue,? 1 Jun/);
  assert.equal(actionableApplicantCount(shift, call), 0);
  assert.equal(marshalApplicationOutcome("APPLIED", shift, null, call).label, "Not booked");
  assert.equal(classifyWithdraw({ status: "APPLIED" }, { ...shift, status: "FILLED" }, new Date(+call - 1)), "allowed");
  assert.equal(classifyWithdraw({ status: "APPLIED" }, shift, call), "stale");
  const { hasShiftEnded, londonCallDate } = require("../lib/state.ts");
  const { schedulesOverlap, shiftConflicts } = require("../lib/availability.ts");
  const { formatShiftBlock } = require("../lib/format.ts");
  const nights = { startDate:new Date("2027-06-01"), endDate:new Date("2027-06-03"), dailyStartTime:"20:00", dailyEndTime:"06:00" };
  const morning = { startDate:new Date("2027-06-04"), endDate:new Date("2027-06-04"), dailyStartTime:"05:59", dailyEndTime:"11:00" };
  assert(schedulesOverlap(nights, morning) && schedulesOverlap(morning, nights));
  assert(!schedulesOverlap(nights, {...morning, dailyStartTime:"06:00"}));
  assert(!schedulesOverlap(nights, {...nights, dailyStartTime:"08:00",dailyEndTime:"16:00"}));
  assert.equal(shiftConflicts(nights,[],[morning]),"marked-unavailable");
  assert.equal(shiftConflicts({...nights,dailyEndTime:"00:00"},[],[morning]),null);
  assert.equal(londonCallDate(new Date("2027-06-01T23:30Z")).toISOString().slice(0,10),"2027-06-02");
  assert(!hasShiftEnded(nights,new Date("2027-06-04T04:59:59Z")));
  assert(hasShiftEnded(nights,new Date("2027-06-04T05:00:00Z")));
  assert.match(formatShiftBlock(nights.startDate,nights.endDate,"20:00","06:00"),/Final wrap Fri,? 4 Jun 2027 at 06:00/);
  assert(!validShiftWindow(new Date("2027-03-26"),new Date("2027-03-29"),"01:30","07:00"));
  assert(!validShiftWindow(new Date("2027-03-27"),new Date("2027-03-27"),"20:00","01:30"));
  assert(validShiftWindow(new Date("2027-03-27"),new Date("2027-03-28"),"20:00","06:00"));
  const draft = { productionName: "QA", location: "London", startDate: "2027-06-01", endDate: "2027-06-01",
    dailyStartTime: "06:00", dailyEndTime: "18:00", marshalsNeeded: 1, rate: 0.01, rateUnit: "HOUR", duties: "Unit base" };
  assert(ShiftDraftSchema.safeParse(draft).success);
  for (const invalid of [{rate:0}, { endDate:"2027-05-31" }, {dailyEndTime:"06:00"}, { startDate:"2027-02-30",endDate:"2027-02-30" }]) {
    assert(!ShiftDraftSchema.safeParse({...draft,...invalid}).success);
  }
});

test("logged workflow regressions against disposable PostgreSQL", async t => {
  const dbUrl = new URL(process.env.DATABASE_URL);
  assert.equal(dbUrl.hostname, "127.0.0.1");
  assert.equal(dbUrl.pathname, "/setru_qa");
  process.env.SETRU_FIXTURE_INTAKE = "1";
  const { PrismaClient } = require("@prisma/client");
  const actor = new AsyncLocalStorage();
  let failNotice;
  const db = new PrismaClient().$extends({ query: { mailDelivery: { async create({ args, query }) {
    if (failNotice && args.data.notification?.create?.kind === failNotice) throw new Error("Simulated notice unavailable");
    return query(args);
  } } } });
  globalThis.__prisma = db;
  t.after(() => db.$disconnect());
  require.cache[require.resolve("../lib/auth.ts")] = { exports: { auth: async () => ({ user:actor.getStore() }) } };
  t.mock.method(require("next/cache"), "revalidatePath", () => {});
  const shifts = require("../app/actions/shifts.ts");
  const hiring = require("../app/actions/hiring.ts");
  const { submitReviewAction } = require("../app/actions/reviews.ts");
  const { updateSupportRequestNoteAction, setSupportRequestResolvedAction, correctPilotRoleAction } = require("../app/actions/founder.ts");
  const { saveManagerProfileAction, saveMarshalProfileAction } = require("../app/actions/profile.ts");
  const { submitWaitlistEntryAction } = require("../app/actions/waitlist.ts");
  const { dispatchDelivery } = require("../lib/notify.ts");
  const nonce = randomUUID();
  process.env.AUTH_SECRET = nonce;
  process.env.RESEND_API_KEY = "local-only";
  delete process.env.SUPPORT_NOTIFY_EMAIL;
  let mailOK = true;
  const sent = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    sent.push({ ...JSON.parse(options.body), key: options.headers["Idempotency-Key"] });
    return new Response(null, {status:mailOK ? 200 : 503});
  });
  const user = (name, role) => db.user.create({ data: { email: name+"-"+nonce+"@example.com",
    emailVerifiedAt:new Date(), passwordHash:"fixture", role, phone:"+447700900011",
    ...(role === "MARSHAL" ? {marshalProfile:{create:{fullName:name,baseLocation:"London",travelRadiusMiles:20,experienceSummary:"Location work"}}}
      : {managerProfile:{create:{companyName:"QA",displayName:name}}}) } });
  const [manager, marshal, waiting, founder] = await Promise.all([user("manager","MANAGER"),user("marshal","MARSHAL"),user("waiting","MARSHAL"),user("founder","MANAGER")]);
  process.env.FOUNDER_EMAILS = founder.email;
  process.env.PILOT_PARTICIPANT_EMAILS = [manager, marshal, waiting].map(u=>u.email).join(",");
  const fresh = {...founder,founderPasscode:true,founderIssuedAt:Date.now()};
  const run = (u, fn, ...args) => actor.run(u, () => fn(...args));
  const redirectTo = async (u, fn, ...args) => {
    try { await run(u, fn, ...args); } catch(e) { if(e.digest?.startsWith("NEXT_REDIRECT;")) return e.digest.split(";")[2]; throw e; }
    throw Error("Expected redirect");
  };
  const form = obj => { const f=new FormData(); for(const [k,v] of Object.entries(obj)) f.set(k,v); return f; };
  const terms = { productionName:nonce, location:"London", startDate:"2099-05-06",endDate:"2099-05-06",
    dailyStartTime:"07:00",dailyEndTime:"18:00",marshalsNeeded:"1",rate:"20",rateUnit:"HOUR",duties:"Unit base" };
  const makeShift = async (status="OPEN") => db.shift.create({data:{ ...terms, startDate:new Date(terms.startDate),
    endDate:new Date(terms.endDate),marshalsNeeded:1,rate:20,status,managerId:manager.id }});
  const apply = (shift, person, status="APPLIED") => db.application.create({data:{shiftId:shift.id,marshalId:person.id,status}});
  await t.test("publish and book a run of nights, then record and correct individual calls", async () => {
    const fields = {...terms, startDate:"2098-05-01", endDate:"2098-05-03", dailyStartTime:"20:00", dailyEndTime:"06:00"};
    const path = await redirectTo(manager, shifts.saveDraftShiftAction, null, form(fields));
    const runId = path.split("/").at(-1);
    const draft = await db.shift.findUniqueOrThrow({where:{id:runId}});
    await redirectTo(manager,shifts.publishShiftAction,runId,draft.updatedAt.toISOString());
    await redirectTo(marshal,hiring.applyToShiftAction,null,form({shiftId:runId}));
    const booking = await db.application.findFirstOrThrow({where:{shiftId:runId,marshalId:marshal.id}});
    await redirectTo(manager,hiring.acceptApplicationAction,booking.id);
    const morning = await makeShift();
    await db.shift.update({where:{id:morning.id},data:{startDate:new Date("2098-05-04"),endDate:new Date("2098-05-04"),dailyStartTime:"05:59",dailyEndTime:"09:00"}});
    assert.match((await run(marshal,hiring.applyToShiftAction,null,form({shiftId:morning.id}))).error,/overlap/);
    const candidate = await apply(morning,marshal);
    assert.match(await redirectTo(manager,hiring.acceptApplicationAction,candidate.id),/conflict/);
    await db.shift.update({where:{id:morning.id},data:{dailyStartTime:"06:00"}});
    assert.match(await redirectTo(manager,hiring.acceptApplicationAction,candidate.id),/booking/);
    await db.shift.update({where:{id:runId},data:{startDate:new Date("2020-05-01"),endDate:new Date("2020-05-03")}});
    const attend = (date, outcome) => form({callDate:date,[booking.id]:outcome});
    assert.match(await redirectTo(manager,shifts.completeShiftAction,runId,attend("2020-05-02","WORKED")),/stale/);
    for (const [date, outcome] of [["2020-05-01","WORKED"],["2020-05-02","NOT_WORKED"],["2020-05-03","WORKED"]]) {
      await redirectTo(manager,shifts.completeShiftAction,runId,attend(date,outcome));
      assert.match(await redirectTo(manager,shifts.completeShiftAction,runId,attend(date,outcome)),/stale/);
    }
    const saved = () => db.application.findUniqueOrThrow({where:{id:booking.id}});
    assert.equal((await saved()).attendance,"PARTIAL");
    assert.equal((await saved()).attendanceDays["2020-05-02"],"NOT_WORKED");
    const corrected = attend("2020-05-02","WORKED");
    corrected.set("previous","NOT_WORKED"); corrected.set("applicationId",booking.id); corrected.set("reason","Confirmed with production");
    await redirectTo(fresh,shifts.resolveAttendanceAction,runId,corrected);
    assert.equal((await saved()).attendance,"WORKED");
    assert.match(await redirectTo(fresh,shifts.resolveAttendanceAction,runId,corrected),/stale/);
    const audit = await db.attendanceChange.findFirstOrThrow({where:{applicationId:booking.id}});
    assert.equal(audit.callDate.toISOString().slice(0,10),"2020-05-02");
  });
  await t.test("mid-run release preserves worked calls and frees dates for replacement bookings", async () => {
    const {dayAfter} = require("../lib/state.ts");
    const today = new Date(new Date().toISOString().slice(0,10));
    const startDate = dayAfter(today,-2), endDate = dayAfter(today,3), released = dayAfter(today,1);
    const shift = await makeShift("FILLED");
    await db.shift.update({where:{id:shift.id},data:{startDate,endDate}});
    const booking = await apply(shift,marshal,"ACCEPTED");
    const attendance = form({callDate:startDate.toISOString().slice(0,10),[booking.id]:"WORKED"});
    await redirectTo(manager,shifts.completeShiftAction,shift.id,attendance);
    assert.match(await redirectTo(manager,shifts.closeShiftAction,shift.id,"FILLED",[booking.id]),/close=attendance/);
    const fields = form({releaseDate:released.toISOString().slice(0,10)});
    await redirectTo(manager,shifts.releaseRemainingCallsAction,shift.id,booking.id,fields);
    assert.match(await redirectTo(manager,shifts.releaseRemainingCallsAction,shift.id,booking.id,fields),/stale/);
    const saved = await db.application.findUniqueOrThrow({where:{id:booking.id}});
    assert.equal(+saved.releasedFrom,+released);
    assert.equal(saved.attendanceDays[startDate.toISOString().slice(0,10)],"WORKED");
    const next = await makeShift();
    await db.shift.update({where:{id:next.id},data:{startDate:released,endDate:released}});
    const app = await apply(next,marshal);
    assert.match(await redirectTo(manager,hiring.acceptApplicationAction,app.id),/booking/);
  });
  await t.test("stale edits, publication and historical terms", async () => {
    const shift = await makeShift("DRAFT");
    const revision = shift.updatedAt.toISOString();
    assert.match(await redirectTo(manager, shifts.updateDraftShiftAction, shift.id, revision, null, form({...terms,rate:"35"})), /manager\/shifts\//);
    assert.match((await run(manager, shifts.updateDraftShiftAction, shift.id, revision,null,form(terms))).error,/not saved/);
    assert.match(await redirectTo(manager,shifts.publishShiftAction,shift.id,revision),/publishBlocked=changed/);
    const current = await db.shift.findUniqueOrThrow({where:{id:shift.id}});
    await redirectTo(manager, shifts.publishShiftAction, shift.id, current.updatedAt.toISOString());
    await apply(shift, marshal, "REJECTED");
    assert.match(await redirectTo(manager,shifts.unpublishShiftAction,shift.id),/revertBlocked/);
    assert.equal((await db.shift.findUniqueOrThrow({where:{id:shift.id}})).rate,35);
    const revised = await makeShift();
    await apply(revised,marshal);
  });
  await t.test("withdrawal, reopening, booking links and failed mail", async () => {
    const shift = await makeShift();
    const booking = await apply(shift,marshal);
    const bench = await apply(shift,waiting);
    mailOK = false;
    await redirectTo(manager,hiring.acceptApplicationAction,booking.id);
    const job = await db.mailDelivery.findFirstOrThrow({where:{shiftId:shift.id,notification:{kind:"APPLICATION_ACCEPTED"}},include:{notification:true}});
    assert.equal(job.notification.link,"/marshal/applications/"+booking.id);
    assert.equal(job.sentAt,null);
    assert(sent.at(-1).text.includes(job.notification.link));
    assert(!sent.at(-1).text.includes(manager.email));
    mailOK=true;
    await Promise.all([dispatchDelivery(job.id,true),dispatchDelivery(job.id,true)]);
    assert.equal(sent.filter(m=>m.key==="setru-"+job.id).length,2);
    assert((await db.mailDelivery.findUniqueOrThrow({where:{id:job.id}})).sentAt);
    await redirectTo(waiting,hiring.withdrawApplicationAction,bench.id);
    assert.equal((await db.shift.findUniqueOrThrow({where:{id:shift.id}})).status,"FILLED");
    const standBy = await user("standby","MARSHAL");
    await apply(shift,standBy);
    failNotice="SHIFT_STATUS_CHANGED";
    await assert.rejects(run(marshal,hiring.withdrawApplicationAction,booking.id),/notice unavailable/);
    assert.equal((await db.application.findUniqueOrThrow({where:{id:booking.id}})).status,"ACCEPTED");
    failNotice=null;
    await redirectTo(marshal,hiring.withdrawApplicationAction,booking.id);
    assert.equal(await db.notification.count({where:{userId:manager.id,subject:"Accepted marshal withdrew: "+nonce}}),1);
    assert.equal(await db.notification.count({where:{userId:standBy.id,subject:"Still under consideration: "+nonce}}),1);
    assert.match(await redirectTo(manager,shifts.reopenAfterDropoutAction,shift.id,booking.id),/dropout=stale/);
    const second=await makeShift();
    const secondBooking=await apply(second,marshal);
    await apply(second,waiting);
    mailOK=false;
    await redirectTo(manager,hiring.acceptApplicationAction,secondBooking.id);
    const lateJob=await db.mailDelivery.findFirstOrThrow({where:{shiftId:second.id,notification:{kind:"APPLICATION_ACCEPTED"}}});
    mailOK=true;
    assert.match(await redirectTo(manager,shifts.reopenAfterDropoutAction,second.id,secondBooking.id),/dropout=saved/);
    await dispatchDelivery(lateJob.id,true);
    assert.equal(sent.filter(m=>m.key==="setru-"+lateJob.id).length,1);
    assert.equal(await db.notification.count({where:{userId:waiting.id,subject:"Still under consideration: "+nonce}}),1);
    await db.shift.update({where:{id:second.id},data:{startDate:new Date("2020-01-01"),endDate:new Date("2020-01-01")}});
    assert.match(await redirectTo(manager,shifts.reopenAfterDropoutAction,second.id,secondBooking.id),/dropout=started/);
  });
  await t.test("review and receipt commit together, including ratings without comments", async () => {
    const shift=await makeShift("COMPLETED");
    const app=await apply(shift,marshal,"ACCEPTED");
    await db.application.update({where:{id:app.id},data:{attendance:"WORKED"}});
    const fields=form({shiftId:shift.id,marshalId:marshal.id,rating:"4"});
    failNotice="REVIEW_RECEIVED";
    assert((await run(manager,submitReviewAction,null,fields)).error);
    assert.equal(await db.review.count({where:{shiftId:shift.id}}),0);
    failNotice=null;
    await redirectTo(manager,submitReviewAction,null,fields);
    await redirectTo(marshal,submitReviewAction,null,form({shiftId:shift.id,rating:"5"}));
    const notes=await db.notification.findMany({where:{kind:"REVIEW_RECEIVED",subject:"New review: "+nonce}});
    for(const review of await db.review.findMany({where:{shiftId:shift.id}})) {
      const base=review.subjectId===manager.id?"/manager/reviews":"/marshal/profile";
      assert(notes.some(n=>n.userId===review.subjectId && n.link===base+"#review-"+review.id));
    }
  });
  await t.test("founder writes require freshness and the expected support revision",async()=>{
    const ticket=await db.supportRequest.create({data:{email:manager.email,category:"OTHER",message:"Synthetic case"}});
    const draft=form({note:"First note",revision:"0"});
    assert((await run({...fresh,founderIssuedAt:0},updateSupportRequestNoteAction,ticket.id,null,draft)).needsLogin);
    assert.equal((await run(fresh,updateSupportRequestNoteAction,ticket.id,null,draft)).savedRevision,1);
    const conflict=await run(fresh,updateSupportRequestNoteAction,ticket.id,null,form({note:"Stale",revision:"0"}));
    assert.equal(conflict.conflict.founderNote,"First note");
    assert.match(await redirectTo(fresh,setSupportRequestResolvedAction,ticket.id,true,0),/triage=conflict/);
    await run(fresh,setSupportRequestResolvedAction,ticket.id,true,1);
    assert((await db.supportRequest.findUniqueOrThrow({where:{id:ticket.id}})).resolvedAt);
  });
  await t.test("profile edits preserve booking phones and role correction stops at hiring activity",async()=>{
    await redirectTo(manager,saveManagerProfileAction,null,form({companyName:"New studio",displayName:"Manager",phone:"+447700900999"}));
    await redirectTo(marshal,saveMarshalProfileAction,null,form({fullName:"Marshal",baseLocation:"London",travelRadiusMiles:"15",experienceSummary:"Worked on location",availability:"OPEN_TO_WORK",phone:"+447700900999"}));
    for(const u of [manager,marshal]) assert.equal((await db.user.findUniqueOrThrow({where:{id:u.id}})).phone,"+447700900011");
    const novice=await user("new","MARSHAL");
    process.env.PILOT_MANAGER_EMAILS=novice.email;
    const { isPilotParticipant }=require("../lib/pilot-participant.ts");
    assert.equal(isPilotParticipant(novice.email,"MARSHAL"),false);
    const fields=form({companyName:"QA",displayName:"New manager"});
    assert.match(await redirectTo(fresh,correctPilotRoleAction,novice.id,"MARSHAL",fields),/role=saved/);
    assert.equal((await db.user.findUniqueOrThrow({where:{id:novice.id}})).role,"MANAGER");
    assert.match(await redirectTo(fresh,correctPilotRoleAction,manager.id,"MANAGER",fields),/role=blocked/);
  });
  await t.test("failed waitlist mail retries once without duplicating the signup",async()=>{
    const email="wait-"+nonce+"@example.com";
    const fields=form({email,role:"MANAGER",name:"QA"});
    mailOK=false;
    await redirectTo(null,submitWaitlistEntryAction,null,fields);
    mailOK=true;
    await Promise.all([1,2].map(()=>redirectTo(null,submitWaitlistEntryAction,null,fields)));
    const entry=await db.waitlistEntry.findFirstOrThrow({where:{email},include:{delivery:true}});
    assert(entry.delivery.sentAt);
    assert.equal(await db.waitlistEntry.count({where:{email}}),1);
    assert.equal(sent.filter(m=>m.to===email).length,2);
  });
});
