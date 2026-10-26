import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import { planRoute } from "../navigation.js";
import { cleanPreferences, loadPreferences } from "../preferences.js";
test("Preferencias inválidas y almacenamiento bloqueado no impiden jugar", () => {
  assert.equal(loadPreferences(null, true).reduceMotion, true);
  assert.equal(cleanPreferences({ volume: Infinity }).volume, 0.65);
  assert.equal(cleanPreferences({ volume: -2, textScale: 5 }).volume, 0);
  assert.equal(cleanPreferences({ textScale: 5 }).textScale, 1.6);
  assert.equal(
    loadPreferences({ getItem: () => "{malformado" }).subtitles,
    true,
  );
});
test("Piloto automático evita cajas de colisión y llega al punto real", () => {
  const start = new T.Vector3(-2, 1, 0),
    end = new T.Vector3(2, 1, 0),
    box = new T.Box3(new T.Vector3(-0.4, 0, -1), new T.Vector3(0.4, 2, 1));
  const route = planRoute(T, start, end, [box], 4);
  let from = start;
  for (const p of route) {
    assert.equal(box.containsPoint(p), false);
    const ray = new T.Ray(from, p.clone().sub(from).normalize()),
      hit = ray.intersectBox(box, new T.Vector3());
    assert.ok(!hit || hit.distanceTo(from) > p.distanceTo(from));
    from = p;
  }
  assert.ok(from.equals(end));
});
