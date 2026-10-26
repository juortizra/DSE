import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAgent } from "../agent.js";
import { unresolvedCrackBound } from "../measurement.js";
const bounded = (point, upper = 2.5, observations = {}) => ({
  photoId: point + 1,
  point,
  quality: 90,
  detections: [],
  optical: { laserValid: true, upperBoundMm: upper },
  observations,
  issues: ["Láser válido; traza no resoluble."],
});
const required = [0, 1, 2, 3, 4, 5, 6];
test("Siete buenas fotos sin anchos precisos no bloquean el resultado", () => {
  const a = evaluateAgent({
    required,
    results: required.map((i) => bounded(i)),
  });
  assert.equal(a.label, "AMARILLO");
  assert.equal(a.coverage, 1);
  assert.equal(a.missing.length, 0);
  assert.equal(a.measuredPoints, 0);
  assert.equal(a.measurementWarnings.length, 7);
  assert.ok(a.rules.some((r) => r.id === "resolucion-precaucion"));
  assert.ok(a.confidence < 0.9);
});
test("Colapso e inclinación se evalúan aunque las fisuras no sean medibles", () => {
  for (const [obs, v] of [
    [{ collapse: true }, 2],
    [{ softCollapse: true }, 2],
    [{ tiltDeg: 1.2 }, 2],
    [{ tiltDeg: 0.6 }, 1],
    [{ threat: "inminente" }, 2],
  ]) {
    assert.equal(
      evaluateAgent({
        required,
        results: required.map((i) => bounded(i, 2.5, i === 0 ? obs : {})),
      }).verdict,
      v,
    );
  }
});
test("Verde solo si todas las cotas/medidas descartan el umbral de 1 mm", () => {
  assert.equal(
    evaluateAgent({ required, results: required.map((i) => bounded(i, 0.8)) })
      .verdict,
    0,
  );
  assert.equal(
    evaluateAgent({
      required,
      results: required.map((i) => bounded(i, i === 0 ? 1 : 0.8)),
    }).verdict,
    1,
  );
});
test("Sin foto, sin lectura, baja calidad y fotos previas a réplica siguen indeterminadas", () => {
  for (const r of [
    required.slice(1).map((i) => bounded(i)),
    required.map((i) => ({ ...bounded(i), quality: 59 })),
    required.map((i) => ({ ...bounded(i), optical: { laserValid: false } })),
    required.map((i) => ({ ...bounded(i), quality: 0 })),
  ])
    assert.equal(evaluateAgent({ required, results: r }).verdict, null);
});
test("Una repetición mejor resuelve el punto y no queda bloqueada por la foto anterior", () => {
  const r = required.map((i) => bounded(i, 2.5));
  r.push(
    ...required.map((i) => ({
      ...bounded(i),
      photoId: 10 + i,
      detections: [
        {
          element: i,
          measure: { measurable: true, widthMm: 0.3, uncertaintyMm: 0.1 },
        },
      ],
    })),
  );
  const a = evaluateAgent({ required, results: r });
  assert.equal(a.verdict, 0);
  assert.equal(a.measuredPoints, 7);
  assert.equal(a.measurementWarnings.length, 0);
});
test("Cota óptica conservadora depende del láser y error, no del ancho real ni del nivel", () => {
  const bound = (mm) =>
    unresolvedCrackBound({
      laser: { valid: true, mm, errorMm: mm * 0.03 + 3 },
      angleDeg: 0,
    });
  assert.ok(bound(200) < 1);
  assert.ok(bound(800) > 1);
  assert.equal(unresolvedCrackBound({ laser: { valid: false } }), null);
  assert.equal(unresolvedCrackBound({ laser: { valid: true, mm: NaN } }), null);
});
