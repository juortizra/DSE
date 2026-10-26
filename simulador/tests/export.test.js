import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32, zipStore, sessionFiles } from "../export.js";
test("CRC estándar y ZIP STORE local/central", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const z = zipStore([{ name: "prueba.txt", data: "abc" }]),
    v = new DataView(z.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(z.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(z.length - 14, true), 1);
});
test("Archivo sin fotos también tiene CSV, verdad e informe sintético", () => {
  const files = sessionFiles({
    photos: [],
    truth: new Map(),
    report: {},
    config: {},
  });
  assert.ok(files.some((f) => f.name === "telemetria.csv"));
  assert.ok(
    JSON.parse(files.find((f) => f.name === "verdad-terreno.json").data)
      .synthetic,
  );
});
