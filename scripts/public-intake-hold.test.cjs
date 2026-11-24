const test = require("node:test");
const assert = require("node:assert/strict");

test("public intake stops before reading fields, accessing storage or sending mail", async t => {
  const { intakeHeld } = require("../lib/intake.ts");
  const keys = ["NODE_ENV", "VERCEL_ENV", "SETRU_FIXTURE_INTAKE"];
  const before = keys.map(key => process.env[key]);
  t.after(() => keys.forEach((key, i) => {
    if (before[i] === undefined) delete process.env[key];
    else process.env[key] = before[i];
  }));
  for (const key of keys) delete process.env[key];
  assert.equal(intakeHeld(), true);
  process.env.SETRU_FIXTURE_INTAKE = "1";
  assert.equal(intakeHeld(), false);
  process.env.VERCEL_ENV = "preview";
  assert.equal(intakeHeld(), true);
  delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = "production";
  assert.equal(intakeHeld(), true);
  const { submitWaitlistEntryAction } = require("../app/actions/waitlist.ts");
  const { signupAction } = require("../app/actions/auth.ts");
  const unreadable = { get() { throw new Error("Closed intake read submitted fields"); } };
  assert.deepEqual(await submitWaitlistEntryAction(null, unreadable), { error: "New waitlist entries are paused." });
  assert.deepEqual(await signupAction(null, unreadable), { error: "New registrations are paused." });
});
