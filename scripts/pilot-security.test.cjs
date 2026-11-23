// Apply prisma/pilot-security.sql to the disposable baseline before running.
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

test("session recovery, founder revocation and public intake controls", async t => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/setru_qa");
  const { prisma } = require("../lib/db.ts");
  t.after(() => prisma.$disconnect());
  const { validateSession } = require("../lib/session-policy.ts");
  const { allowRequest } = require("../lib/request-budget.ts");
  const { generateRawResetToken, hashResetToken, resetExpiry } = require("../lib/reset.ts");
  require.cache[require.resolve("../lib/auth.ts")] = { exports: { auth: async () => null } };
  const { completePasswordResetAction, submitSupportRequestAction } = require("../app/actions/recovery.ts");
  const { submitWaitlistEntryAction } = require("../app/actions/waitlist.ts");
  const email = randomUUID() + "@example.com";
  const user = await prisma.user.create({ data: { email, passwordHash: "test", role: "MARSHAL" } });
  const claims = { uid: user.id, sessionVersion: 0 };
  assert.equal((await validateSession(claims)).role, "MARSHAL");
  assert.equal(await validateSession({ uid: user.id }), null);
  await prisma.user.update({ where: { id: user.id }, data: { role: "MANAGER" } });
  assert.equal((await validateSession(claims)).role, "MANAGER");

  const raw = generateRawResetToken();
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashResetToken(raw), expiresAt: resetExpiry() } });
  const form = new FormData();
  form.set("token", raw);
  form.set("password", randomUUID());
  await assert.rejects(completePasswordResetAction(null, form), e => e.digest?.includes("/login?reset=1"));
  assert.equal(await validateSession(claims), null);
  claims.sessionVersion = 1;
  assert.ok(await validateSession(claims));
  await prisma.user.update({ where: { id: user.id }, data: { disabledAt: new Date() } });
  assert.equal(await validateSession(claims), null);
  await prisma.user.update({ where: { id: user.id }, data: { disabledAt: null } });
  assert.equal(await validateSession(claims), null);

  process.env.FOUNDER_EMAILS = email;
  const founder = { uid: user.id, sessionVersion: 2, founderPasscode: true };
  const record = () => prisma.founderSession.create({ data: { userId: user.id, expiresAt: resetExpiry() } });
  const [one, two] = await Promise.all([record(), record()]);
  const first = { ...founder, founderSessionId: one.id };
  const second = { ...founder, founderSessionId: two.id };
  assert.ok(await validateSession(first));
  await prisma.founderSession.delete({ where: { id: one.id } });
  assert.equal(await validateSession(first), null);
  assert.ok(await validateSession(second));
  await prisma.founderSession.update({ where: { id: two.id }, data: { expiresAt: new Date(0) } });
  assert.equal(await validateSession(second), null);

  process.env.AUTH_SECRET = randomUUID();
  const reservations = await Promise.all(Array.from({ length: 12 }, () => allowRequest("password", email)));
  assert.equal(reservations.filter(Boolean).length, 10);
  assert.ok(await allowRequest("password", "another@example.com"));

  delete process.env.SUPPORT_NOTIFY_EMAIL;
  process.env.RESEND_API_KEY = "test-only";
  const sent = [];
  t.mock.method(globalThis, "fetch", async (_, opts) => {
    sent.push(JSON.parse(opts.body));
    return new Response(null, { status: 200 });
  });
  const { issueFounderPasscode, consumeFounderPasscode } = require("../lib/founder-passcode.ts");
  await issueFounderPasscode(email);
  const challenge = await prisma.founderLoginPasscode.findUniqueOrThrow({ where: { userId: user.id } });
  await prisma.founderLoginPasscode.update({ where: { userId: user.id }, data: { issuedAt: new Date(Date.now() - 120000) } });
  await issueFounderPasscode(email);
  assert.equal(sent.length, 1);
  assert.equal((await prisma.founderLoginPasscode.findUniqueOrThrow({ where: { userId: user.id } })).challengeId, challenge.challengeId);
  const code = sent.pop().text.match(/code is (\d{8})/)[1];
  const grant = await consumeFounderPasscode(email, code);
  assert.ok(grant.founderSessionId);
  assert.equal(await consumeFounderPasscode(email, code), null);
  assert.ok(await validateSession({ ...founder, founderSessionId: grant.founderSessionId }));
  for (const [action, successPath] of [[submitWaitlistEntryAction, "/early-access/thanks"], [submitSupportRequestAction, "/support/thanks"]]) {
    const intake = new FormData();
    for (const [k,v] of Object.entries({ email, name: "Pilot QA", role: "MANAGER", category: "OTHER", message: "Private synthetic support message" })) intake.set(k,v);
    await Promise.all([1,2].map(() => assert.rejects(action(null, intake), e => e.digest?.includes(successPath))));
  }
  assert.equal(sent.length, 2);
  assert.ok(sent.every(message => !message.text.includes("Private synthetic")));
  assert.equal(await prisma.waitlistEntry.count({ where: { email, consentToContact: false } }), 1);
  assert.equal(await prisma.supportRequest.count({ where: { email } }), 1);
});
