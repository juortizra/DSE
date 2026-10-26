import { test } from "node:test";
import assert from "node:assert/strict";
import { measurementAdvice } from "../retake.js";
import { SimulatedDetector } from "../detector.js";
import { evaluateAgent } from "../agent.js";
const photo = {
  id: 1,
  point: 0,
  quality: { accepted: true, score: 90, reasons: [] },
  sensors: {
    laser: { valid: true, mm: 900, errorMm: 30 },
    imu: { wallAngleDeg: 0 },
  },
};
test("No confundir lectura válida con falta de resolución", () => {
  const s = measurementAdvice(photo, 0.2);
  assert.match(s, /Láser válido: 900 mm/);
  assert.match(s, /2.44 mm/);
  assert.match(s, /Acércate/);
  assert.doesNotMatch(s, /Láser inválido/);
});
test("Láser inválido explica el retorno real, no inventa ancho", () => {
  const s = measurementAdvice(
    {
      ...photo,
      sensors: { ...photo.sensors, laser: { valid: false, reason: "Vidrio" } },
    },
    5,
  );
  assert.match(s, /Vidrio/);
  assert.match(s, /50–1200/);
});
test("Cobertura válida con precisión insuficiente produce precaución y no bloqueo", async () => {
  const r = await new SimulatedDetector(() => 0.5).detect(
    photo,
    { widthMm: 0.2, distanceMm: 900, angleDeg: 0 },
    {},
  );
  assert.ok(r.miss);
  const a = evaluateAgent({ required: [0], results: [r] });
  assert.equal(a.label, "AMARILLO");
  assert.equal(a.missing.length, 0);
  assert.match(a.measurementWarnings[0], /Láser válido/);
  assert.match(a.measurementWarnings[0], /px/);
});
