import assert from "node:assert/strict";
import test from "node:test";
import { initialApplications, productions, roster, transition } from "../app/demo/model";
import { marshalApplicationOutcome } from "../lib/application-outcome";

test("the dawn call fills exactly once and releases a booking only for the selected pair", () => {
  const shift = productions[0];
  const apply = { type: "apply", shift: shift.id, marshal: "kit" };
  const accept = { ...apply, type: "accept" };
  const pending = transition(initialApplications, apply);
  assert.equal(transition(pending, apply), pending);
  assert.equal(transition(initialApplications, accept), initialApplications);
  assert.equal(roster(shift, pending).booked, 1);
  const filled = transition(pending, accept);
  assert.deepEqual(roster(shift, filled).entries.map(a => a.status), ["ACCEPTED", "ACCEPTED"]);
  assert.equal(roster(shift, filled).status, "FILLED");
  assert.equal(transition(filled, accept), filled);
  assert.equal(transition(filled, apply), filled);
  assert.equal(marshalApplicationOutcome("ACCEPTED", roster(shift, filled)).label, "Booked");
  assert.equal(roster(shift, initialApplications).booked, 1);
});

test("the seeded application can be accepted first while its shift still has space", () => {
  const shift = productions[1];
  const result = transition(initialApplications, { type: "accept", shift: shift.id, marshal: "kit" });
  assert.equal(roster(shift, result).booked, 1);
  assert.equal(roster(shift, result).status, "OPEN");
  assert.equal(roster(productions[0], result).entries.some(a => a.marshal === "kit"), false);
});

test("unknown or incomplete stored actions cannot create applicants or bookings", () => {
  for (const input of [null, [], true, { type: "accept" },
    { type: "apply", shift: "lockside", marshal: "unknown" },
    { type: "accept", shift: "unknown", marshal: "kit" }]) {
    assert.equal(transition(initialApplications, input), initialApplications);
  }
});
