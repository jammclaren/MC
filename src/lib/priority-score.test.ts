import { test } from "node:test";
import assert from "node:assert/strict";
import { computePriorityScore } from "./priority-score";

const asOf = new Date("2026-08-01T00:00:00Z");

test("red hotspot with no incidents or deployment data scores the hotspot weight", () => {
  const score = computePriorityScore({
    hotspotCategory: "Red",
    incidents: [],
    deployedToPolling: 0,
    registeredVoters: null,
    asOf,
  });
  assert.equal(score, 3);
});

test("recent high-severity incidents raise the score", () => {
  const score = computePriorityScore({
    hotspotCategory: "Yellow",
    incidents: [{ type: "Ambush", date: new Date("2026-07-25T00:00:00Z") }],
    deployedToPolling: 0,
    registeredVoters: null,
    asOf,
  });
  assert.equal(score, 2 + 3);
});

test("incidents older than the 30-day window are excluded", () => {
  const score = computePriorityScore({
    hotspotCategory: "Green",
    incidents: [{ type: "Ambush", date: new Date("2026-01-01T00:00:00Z") }],
    deployedToPolling: 0,
    registeredVoters: null,
    asOf,
  });
  assert.equal(score, 1);
});

test("unrecognized incident types fall back to the default weight", () => {
  const score = computePriorityScore({
    hotspotCategory: null,
    incidents: [{ type: "unclassified event", date: asOf }],
    deployedToPolling: 0,
    registeredVoters: null,
    asOf,
  });
  assert.equal(score, 1);
});

test("higher deployment coverage relative to registered voters lowers the score", () => {
  const low = computePriorityScore({
    hotspotCategory: "Red",
    incidents: [],
    deployedToPolling: 10,
    registeredVoters: 10000,
    asOf,
  });
  const high = computePriorityScore({
    hotspotCategory: "Red",
    incidents: [],
    deployedToPolling: 5000,
    registeredVoters: 10000,
    asOf,
  });
  assert.ok(high < low);
});

test("zero or missing registered voters never divides by zero", () => {
  const zeroVoters = computePriorityScore({
    hotspotCategory: "Red",
    incidents: [],
    deployedToPolling: 50,
    registeredVoters: 0,
    asOf,
  });
  const nullVoters = computePriorityScore({
    hotspotCategory: "Red",
    incidents: [],
    deployedToPolling: 50,
    registeredVoters: null,
    asOf,
  });
  assert.equal(zeroVoters, 3);
  assert.equal(nullVoters, 3);
  assert.ok(Number.isFinite(zeroVoters));
  assert.ok(Number.isFinite(nullVoters));
});

test("coverage deduction is capped so heavy deployment can't erase a hotspot entirely", () => {
  const score = computePriorityScore({
    hotspotCategory: "Red",
    incidents: [],
    deployedToPolling: 100000,
    registeredVoters: 1000,
    asOf,
  });
  assert.equal(score, 3 - 3);
});
