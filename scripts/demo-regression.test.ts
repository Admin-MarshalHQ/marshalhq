import assert from "node:assert/strict";
import test from "node:test";
import { initialApplications, productions, roster, transition } from "../app/demo/model";
import { marshalApplicationOutcome } from "../lib/application-outcome";

test("the dawn call fills exactly once and releases a booking only for the selected pair", () => {
  const shift = productions[0];
  const apply = { type: "apply", shift: shift.id, marshal: "alex" };
  const accept = { ...apply, type: "accept" };
  const pending = transition(initialApplications, apply);
  assert.equal(transition(pending, apply), pending);
  assert.equal(transition(initialApplications, accept), initialApplications);
  assert.equal(roster(shift, pending).booked, 1);
  const filled = transition(pending, accept);
  const entries = roster(shift, filled).entries;
  assert.deepEqual(entries.filter(a => a.status === "ACCEPTED").map(a => a.marshal).sort(), ["alex", "nell"]);
  assert.equal(entries.find(a => a.marshal === "robin")?.status, "APPLIED");
  assert.equal(roster(shift, filled).status, "FILLED");
  assert.equal(transition(filled, accept), filled);
  assert.equal(transition(filled, apply), filled);
  assert.equal(marshalApplicationOutcome("ACCEPTED", roster(shift, filled)).label, "Booked");
  assert.equal(roster(shift, initialApplications).booked, 1);
});

test("the seeded application can be accepted first while its shift still has space", () => {
  const shift = productions[1];
  const result = transition(initialApplications, { type: "accept", shift: shift.id, marshal: "alex" });
  assert.equal(roster(shift, result).booked, 1);
  assert.equal(roster(shift, result).status, "OPEN");
  assert.equal(roster(productions[0], result).entries.some(a => a.marshal === "alex"), false);
});

test("unknown or incomplete stored actions cannot create applicants or bookings", () => {
  for (const input of [null, [], true, { type: "accept" },
    { type: "apply", shift: "lockside", marshal: "unknown" },
    { type: "accept", shift: "unknown", marshal: "alex" }]) {
    assert.equal(transition(initialApplications, input), initialApplications);
  }
});

test("choosing Robin preserves Alex’s application as shift filled, including after replay", () => {
  const lockside = productions[0];
  const apply = { type: "apply", shift: lockside.id, marshal: "alex" };
  const bookRobin = { type: "accept", shift: lockside.id, marshal: "robin" };
  const moves = [apply, bookRobin];
  const result = moves.reduce(transition, initialApplications);
  const full = roster(lockside, result);
  const alex = full.entries.find(a => a.marshal === "alex")!;
  assert.equal(full.booked, 2);
  assert.equal(alex.coverNote, lockside.note);
  assert.equal(alex.status, "APPLIED");
  assert.equal(marshalApplicationOutcome(alex.status, full).label, "Shift filled");
  assert.equal(transition(result, { ...apply, type: "accept" }), result);
  assert.deepEqual(JSON.parse(JSON.stringify(moves)).reduce(transition, initialApplications), result);
  assert.equal(transition(transition(initialApplications, bookRobin), apply).some(a => a.shift === "lockside" && a.marshal === "alex"), false);
});

test("existing demo sessions retain the renamed marshal’s applications and bookings", () => {
  const moves = [
    { type: "apply", shift: "lockside", marshal: "kit" },
    { type: "accept", shift: "lockside", marshal: "kit" },
  ];
  const replay = moves.reduce(transition, initialApplications);
  assert.equal(roster(productions[0], replay).entries.find(a => a.marshal === "alex")?.status, "ACCEPTED");
});
