import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreSession } from "../scoring.js";
const input = {
  expected: 2,
  decision: 2,
  coverage: 1,
  quality: 1,
  stats: {
    flights: 1,
    batteryUsed: 0,
    seconds: 0,
    crashes: 0,
    contacts: 0,
    boundaries: 0,
  },
  photoCount: 7,
  goodCount: 7,
};
test("Rúbrica y error crítico", () => {
  assert.equal(scoreSession(input).total, 100);
  assert.equal(scoreSession({ ...input, decision: 0 }).total, 0);
  assert.equal(scoreSession({ ...input, decision: 1 }).decision, 10);
  assert.equal(scoreSession({ ...input, expected: 1 }).decision, 30);
});
