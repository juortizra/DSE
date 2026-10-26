import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAgent } from "../agent.js";
const result = (width = 0.3, error = 0.1, obs = {}, point = 0) => ({
  photoId: point + 1,
  point,
  quality: 95,
  observations: obs,
  detections: [
    {
      element: point,
      measure: { measurable: true, widthMm: width, uncertaintyMm: error },
    },
  ],
});
const agent = (r, required = [0]) => evaluateAgent({ required, results: r });
test("Capilares, límites 1/5 mm, peor caso de incertidumbre", () => {
  assert.equal(agent([result()]).verdict, 0);
  assert.equal(agent([result(1, 0)]).verdict, 1);
  assert.equal(agent([result(5, 0)]).verdict, 1);
  const a = agent([result(4.6, 0.7)]);
  assert.equal(a.verdict, 1);
  assert.ok(a.rules.some((r) => r.text.includes("no se descarta 5")));
  assert.equal(agent([result(0.8, 0.3)]).verdict, 1);
});
test("Tres elementos severos, no tres fotos del mismo", () => {
  assert.equal(
    agent(
      [0, 1, 2].map((i) => result(5, 0, {}, i)),
      [0, 1, 2],
    ).verdict,
    2,
  );
  assert.equal(agent([result(5), result(6), result(8)]).verdict, 1);
});
test("Inclinación exacta y colapso", () => {
  for (const [a, v] of [
    [0.499, 0],
    [0.5, 1],
    [0.999, 1],
    [1, 2],
  ])
    assert.equal(agent([result(0.2, 0.1, { tiltDeg: a })]).verdict, v);
  assert.equal(agent([result(0.2, 0.1, { collapse: true })]).verdict, 2);
  assert.equal(agent([result(0.2, 0.1, { softCollapse: true })]).verdict, 2);
});
test("Amenazas, indeterminado, baja calidad y medida inválida", () => {
  assert.equal(agent([result(0.2, 0.1, { threat: "externa" })]).verdict, 1);
  assert.equal(agent([result(0.2, 0.1, { threat: "inminente" })]).verdict, 2);
  assert.equal(agent([], [0]).label, "INDETERMINADO");
  assert.equal(agent([{ ...result(), quality: 59 }]).verdict, null);
  assert.equal(agent([{ ...result(), detections: [] }]).verdict, null);
  assert.equal(
    agent([result(0.2, 0.1, { collapse: true })], [0, 1]).riskMinimum,
    2,
  );
});
