import { CONFIG as C } from "./config.js";
// Límites de fotografía del juego, NO especificaciones certificadas del sensor.
export function photoQuality({
  distance,
  angle,
  speed,
  light,
  framed,
  visible,
  laserValid,
  impact = false,
}) {
  const reasons = [];
  if (!laserValid)
    reasons.push(
      "Láser fuera de rango (50–1200 mm) o sin superficie: apunta al muro.",
    );
  if (distance > C.quality.maxDistanceM)
    reasons.push(
      `Muy lejos (${distance.toFixed(2)} m): acércate a 1,2 m o menos.`,
    );
  if (distance < C.quality.minDistanceM)
    reasons.push(
      `Demasiado cerca (${distance.toFixed(2)} m): retrocede hasta 0,05 m.`,
    );
  if (!framed)
    reasons.push(
      "La grieta no está completa en el cuadro: centra el círculo y encuadra sus extremos.",
    );
  if (!visible)
    reasons.push(
      "Objetivo oculto por otra superficie: busca una línea de visión despejada.",
    );
  if (angle > C.quality.angleDeg)
    reasons.push(
      `Muy inclinado respecto al muro (${angle.toFixed(0)}°): orienta el dron de frente.`,
    );
  if (speed > C.quality.maxSpeed || impact)
    reasons.push(
      "Dron en movimiento: foto movida. Suelta los controles y espera a estabilizar.",
    );
  if (light < C.quality.minLight)
    reasons.push(
      "Muy oscuro: activa la luz del módulo [T] o busca un ángulo iluminado.",
    );
  const clamp = (x) => Math.max(0, Math.min(1, x));
  let score = Math.round(
    100 *
      (C.quality.weights.distance *
        clamp(
          1 -
            Math.abs(distance - C.quality.preferredDistanceM) /
              C.quality.distanceScaleM,
        ) +
        C.quality.weights.angle * clamp(1 - angle / C.quality.angleScaleDeg) +
        C.quality.weights.speed * clamp(1 - speed / C.quality.speedScaleMps) +
        C.quality.weights.light * clamp(light) +
        C.quality.weights.framing * (framed && visible ? 1 : 0)),
  );
  if (reasons.length) score = Math.min(C.quality.accepted - 1, score);
  return { score, accepted: score >= C.quality.accepted, reasons };
}
