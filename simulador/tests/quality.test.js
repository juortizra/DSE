import { test } from "node:test";
import assert from "node:assert/strict";
import { photoQuality } from "../quality.js";
const good = {
  distance: 0.85,
  angle: 0,
  speed: 0,
  light: 0.85,
  framed: true,
  visible: true,
  laserValid: true,
};
test("Toma estable frontal aceptada a partir de 60%", () => {
  const q = photoQuality(good);
  assert.ok(q.accepted && q.score >= 60);
});
for (const [name, change, reason] of [
  ["lejos", { distance: 2.3 }, "Muy lejos"],
  ["cerca", { distance: 0.2 }, "Demasiado cerca"],
  ["ángulo", { angle: 55 }, "inclinado"],
  ["movida", { speed: 1.2 }, "movimiento"],
  ["oscuridad", { light: 0.15 }, "oscuro"],
  ["encuadre", { framed: false }, "completa"],
  ["oclusión", { visible: false }, "oculto"],
  ["láser", { laserValid: false }, "rango"],
  ["roce", { impact: true }, "movimiento"],
])
  test("Rechazo: " + name, () => {
    const q = photoQuality({ ...good, ...change });
    assert.equal(q.accepted, false);
    assert.ok(q.reasons.some((r) => r.includes(reason)));
    assert.ok(q.score < 60);
  });
