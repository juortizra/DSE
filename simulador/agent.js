import { CONFIG as C } from "./config.js";
export const LABELS = ["VERDE", "AMARILLO", "ROJO"];
export const DISCLAIMER =
  "Clasificación provisional; no sustituye al evaluador certificado ni a la Fase 2.";
export function evaluateAgent({ required, results }) {
  const valid = results.filter((r) => r.quality >= C.quality.accepted),
    missing = [],
    measurementWarnings = [],
    unresolved = [];
  let measuredPoints = 0;
  for (const id of required) {
    const r = valid.filter((r) => r.point === id);
    if (!r.length) {
      missing.push(
        `Checkpoint ${id + 1}: falta foto de calidad ≥ ${C.quality.accepted}%. ${
          results
            .filter((r) => r.point === id)
            .at(-1)
            ?.issues?.join(" ") || ""
        }`,
      );
      continue;
    }
    if (
      r.some((r) =>
        r.detections.some((d) => !d.suspect && d.measure.measurable),
      )
    ) {
      measuredPoints++;
      continue;
    }
    const bounded = r
      .filter(
        (r) =>
          r.optical?.laserValid &&
          Number.isFinite(r.optical.upperBoundMm) &&
          r.optical.upperBoundMm > 0,
      )
      .sort((a, b) => a.optical.upperBoundMm - b.optical.upperBoundMm)[0];
    if (bounded) {
      unresolved.push({
        point: id,
        upperBoundMm: bounded.optical.upperBoundMm,
      });
      measurementWarnings.push(
        `Checkpoint ${id + 1}: foto válida, ancho no medido. Cota óptica conservadora ${bounded.optical.upperBoundMm.toFixed(2)} mm (no es una medición ni certifica seguridad). ${bounded.issues?.join(" ") || ""}`,
      );
    } else
      missing.push(
        `Checkpoint ${id + 1}: falta una lectura de distancia o evidencia utilizable. ${r.at(-1)?.issues?.join(" ") || ""}`,
      );
  }
  const rules = [];
  const add = (id, level, text) => rules.push({ id, level, text });
  const obs = valid.map((r) => r.observations ?? {}),
    tilt = Math.max(0, ...obs.map((o) => o.tiltDeg ?? 0));
  if (obs.some((o) => o.collapse || o.softCollapse))
    add("colapso", 2, "Colapso parcial/total o piso blando colapsado.");
  if (tilt >= C.agent.tiltRedDeg)
    add(
      "inclinacion",
      2,
      `Inclinación estimada ${tilt.toFixed(2)}° ≥ ${C.agent.tiltRedDeg}°.`,
    );
  else if (tilt >= C.agent.tiltYellowDeg)
    add(
      "inclinacion",
      1,
      `Inclinación estimada ${tilt.toFixed(2)}° ≥ ${C.agent.tiltYellowDeg}°.`,
    );
  const severe = new Set();
  let moderate = false;
  for (const r of valid)
    for (const d of r.detections) {
      const m = d.measure;
      if (!m.measurable) continue;
      const upper = m.widthMm + m.uncertaintyMm;
      for (const threshold of [C.agent.crackYellowMm, C.agent.crackSevereMm])
        if (m.widthMm < threshold && upper >= threshold)
          add(
            `incertidumbre-${r.photoId}-${threshold}`,
            threshold === C.agent.crackYellowMm ? 1 : 0,
            `${m.widthMm.toFixed(1)} ± ${m.uncertaintyMm.toFixed(1)} mm: no se descarta ${threshold} mm o más${d.suspect ? " (posible sombra/mancha; revisar)" : ""}.`,
          );
      if (upper >= C.agent.crackSevereMm) severe.add(d.element);
      else if (upper >= C.agent.crackYellowMm) moderate = true;
    }
  if (severe.size >= C.agent.severeElementsRed)
    add(
      "extendido",
      2,
      `Daño severo en ${severe.size} elementos distintos (≥ ${C.agent.severeElementsRed}).`,
    );
  else if (severe.size)
    add(
      "localizado",
      1,
      `Daño severo localizado en ${severe.size} elemento(s); requiere evaluación detallada.`,
    );
  if (moderate)
    add(
      "moderadas",
      1,
      "Grietas de 1 a 5 mm o su incertidumbre: daño moderado/generalizado.",
    );
  if (obs.some((o) => o.threat === "inminente"))
    add("amenaza", 2, "Amenaza externa inminente.");
  else if (obs.some((o) => o.threat === "externa"))
    add(
      "amenaza",
      1,
      "Amenaza externa (parapeto, vecino o cable): amarillo como mínimo.",
    );
  if (unresolved.some((p) => p.upperBoundMm >= C.agent.crackYellowMm))
    add(
      "resolucion-precaucion",
      1,
      `En las fotos válidas, la resolución no permite descartar ${C.agent.crackYellowMm} mm o más en ${unresolved.filter((p) => p.upperBoundMm >= C.agent.crackYellowMm).length} punto(s): AMARILLO por precaución. No se ha inventado un ancho; las evidencias de colapso o amenaza siguen teniendo prioridad.`,
    );
  if (!rules.length)
    add(
      missing.length ? "sin-evidencia" : "capilares",
      0,
      missing.length
        ? "Sin observaciones concluyentes: no autoriza el uso."
        : "Medidas o cotas ópticas conservadoras por debajo de 1 mm; sin otros indicios modelados. No equivale a certificar habitabilidad.",
    );
  const riskMinimum = Math.max(...rules.map((r) => r.level)),
    covered = required.filter((id) => valid.some((r) => r.point === id)).length,
    coverage = required.length ? covered / required.length : 0,
    quality = valid.length
      ? valid.reduce((s, r) => s + r.quality, 0) / valid.length / 100
      : 0;
  return {
    verdict: missing.length ? null : riskMinimum,
    label: missing.length ? "INDETERMINADO" : LABELS[riskMinimum],
    riskMinimum,
    rules,
    missing,
    coverage,
    confidence:
      coverage *
      quality *
      (1 -
        (required.length ? unresolved.length / required.length : 0) *
          (1 - C.agent.unresolvedConfidenceFactor)),
    measuredPoints,
    measurementWarnings,
    unresolvedPoints: unresolved,
    notEvaluable: [
      "Olor a gas y fugas",
      "Cimentaciones y daños ocultos",
      "Resistencia residual y seguridad de ingreso",
    ],
    disclaimer: DISCLAIMER,
    referral:
      riskMinimum >= 1 ? "Remitido a evaluación detallada (Fase 2)" : "",
  };
}
