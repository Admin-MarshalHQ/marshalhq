const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { EventEmitter, once } = require("node:events");
const { test } = require("node:test");

test("verification dispatch, read-only previews and single-use confirmation", async t => {
  const db = new URL(process.env.DATABASE_URL);
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.pathname, "/setru_qa");
  const { prisma } = require("../lib/db.ts");
  const { issueEmailVerification, emailVerificationState, confirmEmailVerification } =
    require("../lib/email-verification.ts");
  const { hashEmailVerificationToken } = require("../lib/verify-email.ts");
  const email = randomUUID() + "@example.com";
  const user = await prisma.user.create({ data: { email, passwordHash: "test" } });
  t.after(async () => {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });
  process.env.RESEND_API_KEY = "test-only";
  const tokens = [];
  let dispatch = () => new Response(null, { status: 200 });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    assert.equal(body.to, email);
    tokens.push(body.text.match(/\/verify-email\/([a-f0-9]{64})/)[1]);
    return dispatch();
  });
  const issue = () => issueEmailVerification(user.id, email);
  const account = () => prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  dispatch = () => new Response(null, { status: 503 });
  assert.equal(await issue(), "failed");
  assert.equal(await emailVerificationState(tokens[0]), "invalid");
  assert.equal(await confirmEmailVerification(tokens[0]), false);

  dispatch = () => new Response(null, { status: 200 });
  assert.equal(await issue(), "sent");
  const working = tokens.at(-1);
  dispatch = () => { throw new Error("mock network failure"); };
  assert.equal(await issue(), "failed");
  assert.equal(await emailVerificationState(tokens.at(-1)), "invalid");
  assert.equal(await emailVerificationState(working), "ready");

  // Hold an accepted send in flight while another replacement finishes first.
  const gate = new EventEmitter();
  const started = once(gate, "started");
  dispatch = async () => {
    gate.emit("started");
    await once(gate, "release");
    return new Response(null, { status: 200 });
  };
  const slow = issue();
  await started;
  const older = tokens.at(-1);
  assert.equal(await emailVerificationState(working), "ready");
  dispatch = () => new Response(null, { status: 200 });
  assert.equal(await issue(), "sent");
  const newest = tokens.at(-1);
  gate.emit("release");
  assert.equal(await slow, "sent");
  assert.equal(await emailVerificationState(working), "invalid");
  assert.equal(await emailVerificationState(older), "invalid");
  assert.equal(await emailVerificationState(newest), "ready");
  assert.equal(await emailVerificationState(newest), "ready");
  assert.equal((await account()).emailVerifiedAt, null);

  const expired = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hashEmailVerificationToken(expired), expiresAt: new Date(0) },
  });
  assert.equal(await emailVerificationState(expired), "invalid");
  assert.equal(await confirmEmailVerification(expired), false);
  assert.equal(await confirmEmailVerification("invalid"), false);
  assert.equal((await account()).emailVerifiedAt, null);

  // Legacy accounts can have multiple usable links. Two clicks must agree on
  // the final state without changing the verification time or leaving live tokens.
  const sibling = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hashEmailVerificationToken(sibling), expiresAt: new Date(Date.now() + 60000) },
  });
  assert.deepEqual(await Promise.all([confirmEmailVerification(newest), confirmEmailVerification(sibling)]), [true, true]);
  const verifiedAt = (await account()).emailVerifiedAt;
  assert.ok(verifiedAt);
  assert.equal(await emailVerificationState(newest), "verified");
  assert.equal(await confirmEmailVerification(newest), true);
  assert.deepEqual((await account()).emailVerifiedAt, verifiedAt);
  assert.equal(await prisma.emailVerificationToken.count({ where: { userId: user.id, usedAt: null } }), 0);
});
