import assert from "node:assert/strict";
import { test } from "node:test";
import { marshalApplicationOutcome } from "../lib/application-outcome";
import { confirmAcceptBody } from "../lib/copy";
import { isShiftSchedulable } from "../lib/state";
import { currentBookings, managerAttention } from "../lib/workspace-shifts";

const today = new Date(2026, 10, 23);
const now = new Date(2026, 10, 23, 12);
const yesterday = new Date(2026, 10, 22);
const tomorrow = new Date(2026, 10, 24);
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
    ["ACCEPTED", "COMPLETED", "Completed"],
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
