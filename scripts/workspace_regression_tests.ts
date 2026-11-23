import assert from "node:assert/strict";
import { test } from "node:test";
import { marshalApplicationOutcome } from "../lib/application-outcome";
import { confirmAcceptBody, notificationDisplayBody } from "../lib/copy";
import { sendEmail } from "../lib/mail";
import { isShiftSchedulable } from "../lib/state";
import { currentBookings, managerAttention } from "../lib/workspace-shifts";

const today = new Date(Date.UTC(2026, 10, 23));
const now = new Date(Date.UTC(2026, 10, 23, 12));
const yesterday = new Date(Date.UTC(2026, 10, 22));
const tomorrow = new Date(Date.UTC(2026, 10, 24));
const shift = {
  startDate: today,
  endDate: today,
  dailyStartTime: "13:00",
  dailyEndTime: "18:00",
  status: "OPEN",
  paused: false,
  marshalsNeeded: 2,
  bookedCount: 0,
  pendingCount: 3,
};

test("discovery uses the call time cutoff, including exactly at call time", () => {
  assert(isShiftSchedulable(shift, now));
  assert(!isShiftSchedulable({ ...shift, dailyStartTime: "11:59" }, now));
  assert(!isShiftSchedulable({ ...shift, dailyStartTime: "12:00" }, now));
  assert(!isShiftSchedulable({ ...shift, startDate: yesterday, endDate: tomorrow }, now));
});

test("featured bookings sort by call time and keep a current multi-day booking through its final wrap", () => {
  const accepted = { status: "ACCEPTED", shift };
  const late = { ...accepted, id: "late", shift: { ...shift, dailyStartTime: "14:00" } };
  const early = { ...accepted, id: "early" };
  const elapsed = {
    ...accepted,
    id: "elapsed",
    shift: { ...shift, startDate: yesterday, dailyEndTime: "12:00", status: "FILLED" },
  };
  const current = {
    ...accepted,
    id: "current",
    shift: { ...shift, startDate: yesterday, endDate: tomorrow, dailyEndTime: "11:00" },
  };
  const completed = { ...elapsed, id: "completed", shift: { ...elapsed.shift, status: "COMPLETED" } };
  assert.deepEqual(
    currentBookings([late, early, elapsed, current, completed], now).map((a) => a.id),
    ["current", "early", "late"],
  );
  assert.deepEqual(currentBookings([late, early, elapsed], now).map((a) => a.id), ["early", "late"]);
});

test("attention prioritises live reviews by call time and emits one row for elapsed work", () => {
  const late = { ...shift, id: "late", dailyStartTime: "15:00" };
  const early = { ...shift, id: "early", bookedCount: 1 };
  const elapsed = { ...shift, id: "elapsed", dailyStartTime: "11:59" };
  const done = {
    ...shift,
    id: "done",
    startDate: yesterday,
    endDate: yesterday,
    bookedCount: 2,
    status: "FILLED",
  };
  const paused = { ...shift, id: "paused", paused: true };
  const noSlot = { ...shift, id: "no-slot", bookedCount: 2 };
  assert.deepEqual(
    managerAttention([late, elapsed, paused, done, noSlot, early], now)
      .map(({ shift, kind, count }) => [shift.id, kind, count]),
    [
      ["early", "review", 3],
      ["late", "review", 3],
      ["done", "completion", 0],
      ["elapsed", "elapsed", 3],
    ],
  );
});

test("acceptance copy projects the result for the current capacity", () => {
  assert.match(confirmAcceptBody(1, 3), /book 2 of 3 places\. One place will remain open/);
  assert.match(confirmAcceptBody(0, 3), /book 1 of 3 places\. 2 places will remain open/);
  assert.match(confirmAcceptBody(1, 2), /book 2 of 2 places\. The shift will be filled/);
  assert.match(confirmAcceptBody(0, 1), /shared between you and this marshal/);
});

test("application outcomes reflect the marshal's place, independent of other bookings", () => {
  const cases = [
    ["APPLIED", "OPEN", "Application received"],
    ["ACCEPTED", "OPEN", "Booked"],
    ["ACCEPTED", "FILLED", "Booked"],
    ["APPLIED", "FILLED", "Shift filled"],
    ["ACCEPTED", "COMPLETED", "Attendance unconfirmed"],
    ["PRODUCTION_CANCELLED", "CLOSED", "Cancelled by production"],
    ["APPLIED", "COMPLETED", "Shift completed"],
    ["REJECTED", "OPEN", "Rejected"],
    ["WITHDRAWN", "OPEN", "Withdrawn"],
    ["APPLIED", "CLOSED", "Shift closed"],
    ["REJECTED", "CLOSED", "Shift closed"],
    ["WITHDRAWN", "CLOSED", "Shift closed"],
    ["ACCEPTED", "CLOSED", "Booking cancelled"],
  ];
  for (const [status, shiftStatus, expected] of cases) {
    assert.equal(marshalApplicationOutcome(status, { ...shift, status: shiftStatus }).label, expected);
  }
  assert.equal(
    marshalApplicationOutcome("APPLIED", { ...shift, status: "FILLED" }).detail,
    "Your application can be reviewed again if a place reopens.",
  );
});

test("historic notifications rebrand the platform reference and retain project names", () => {
  assert.equal(
    notificationDisplayBody("REVIEW_RECEIVED", "Review for MarshalHQ Studios. See it on your MarshalHQ profile."),
    "A review was submitted. Check the current booking record.",
  );
  assert.equal(
    notificationDisplayBody("SHIFT_STATUS_CHANGED", "If you have questions about this cancellation, contact MarshalHQ support and we’ll follow up."),
    "If you have questions about this cancellation, contact Setru support and we’ll follow up.",
  );
  assert.equal(
    notificationDisplayBody("APPLICATION_SUBMITTED", "A marshal applied for MarshalHQ Studios."),
    "A marshal applied for MarshalHQ Studios.",
  );
});

test("transactional email keeps the configured address under the Setru sender name", async (t) => {
  const saved = { apiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
  t.after(() => {
    if (saved.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = saved.apiKey;
    if (saved.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = saved.from;
  });

  process.env.RESEND_API_KEY = "test-only";
  const messages: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    messages.push(JSON.parse(String(options.body)).from);
    return new Response(null, { status: 200 });
  });

  for (const sender of ["MarshalHQ <admin@marshalhq.com>", "admin@marshalhq.com"]) {
    process.env.EMAIL_FROM = sender;
    const result = await sendEmail({ to: "marshal@example.com", subject: "Setru waitlist", body: "Test" });
    assert.deepEqual(result, { ok: true, channel: "resend" });
  }
  assert.deepEqual(messages, ["Setru <admin@marshalhq.com>", "Setru <admin@marshalhq.com>"]);
});

test("waitlist submissions send matching HTML and plain text after storage with a minimal founder alert", async (t) => {
  const keys = ["RESEND_API_KEY", "SUPPORT_NOTIFY_EMAIL", "AUTH_SECRET"] as const;
  const saved = keys.map((key) => process.env[key]);
  t.after(() => {
    keys.forEach((key, i) => {
      const value = saved[i];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });
  process.env.RESEND_API_KEY = "test-only";
  process.env.AUTH_SECRET = "unit-test-only";
  process.env.SUPPORT_NOTIFY_EMAIL = "founder@example.com";

  let storedRole: string | undefined;
  const savedPrisma = globalThis.__prisma;
  t.after(() => { globalThis.__prisma = savedPrisma; });
  globalThis.__prisma = {
    $transaction: async (run: (tx: unknown) => unknown) => run(globalThis.__prisma),
    $executeRaw: async () => 1,
    requestBudget: { deleteMany: async () => ({ count: 0 }) },
    waitlistEntry: {
      findFirst: async () => null,
      create: async (input: { data: { role: string } }) => {
        storedRole = input.data.role;
        return { id: "test-entry", createdAt: new Date("2026-11-23T00:00:00Z") };
      },
    },
  } as unknown as typeof savedPrisma;
  const { submitWaitlistEntryAction } = await import("../app/actions/waitlist");

  const messages: Array<Record<string, string>> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert(storedRole);
    messages.push(JSON.parse(String(options.body)));
    return new Response(null, { status: 200 });
  });

  for (const [role, label] of [["MANAGER", "Manager"], ["MARSHAL", "Marshal"], ["OTHER", "Other"]]) {
    storedRole = undefined;
    const form = new FormData();
    form.set("name", "Waitlist QA");
    form.set("email", `${role.toLowerCase()}@example.com`);
    form.set("role", role);
    form.set("consentToContact", "on");
    if (role === "OTHER") form.set("roleOther", "<em>Private free text</em>");

    await assert.rejects(submitWaitlistEntryAction(null, form), (error: Error & { digest?: string }) =>
      error.message === "NEXT_REDIRECT" && !!error.digest?.includes(";/early-access/thanks;"),
    );
    assert.equal(storedRole, role);
    assert.equal(messages.length, 2);
    const [visitor, founder] = messages.splice(0);
    assert.equal(visitor.to, `${role.toLowerCase()}@example.com`);
    assert.match(visitor.subject, /Setru waitlist/);
    assert.match(visitor.text, new RegExp(`Role submitted: ${label}`));
    assert.match(visitor.html, new RegExp(`Role submitted:</strong> ${label}`));
    assert.match(visitor.html, /<meta name="viewport"/);
    for (const content of [visitor.text, visitor.html]) {
      assert.match(content, /isn’t an account or an invitation/);
      assert.match(content, /private beta places open for your role/);
      assert.match(content, /https:\/\/setru\.co\.uk\/support/);
      assert.match(content, /https:\/\/setru\.co\.uk\/privacy/);
      assert.doesNotMatch(content, /Private free text|reply to this email/i);
    }
    assert.equal(founder.to, "founder@example.com");
    assert.equal(founder.subject, "New Setru waitlist entry");
    assert.doesNotMatch(founder.text, /Private free text|Waitlist QA|example.com/);
    assert.equal(founder.html, undefined);
  }
});
