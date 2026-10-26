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
      "Láser fuera de rango (0,15–4 m) o sin superficie: apunta al muro.",
    );
  if (distance > 1.2)
    reasons.push(
      `Muy lejos (${distance.toFixed(2)} m): acércate a 1,2 m o menos.`,
    );
  if (distance < 0.45)
    reasons.push(
      `Demasiado cerca (${distance.toFixed(2)} m): retrocede hasta 0,45 m.`,
    );
  if (!framed)
    reasons.push(
      "La grieta no está completa en el cuadro: centra el círculo y encuadra sus extremos.",
    );
  if (!visible)
    reasons.push(
      "Objetivo oculto por otra superficie: busca una línea de visión despejada.",
    );
  if (angle > 25)
    reasons.push(
      `Muy inclinado respecto al muro (${angle.toFixed(0)}°): orienta el dron de frente.`,
    );
  if (speed > 0.35 || impact)
    reasons.push(
      "Dron en movimiento: foto movida. Suelta los controles y espera a estabilizar.",
    );
  if (light < 0.25)
    reasons.push(
      "Muy oscuro: activa la luz del módulo [T] o busca un ángulo iluminado.",
    );
  const clamp = (x) => Math.max(0, Math.min(1, x));
  let score = Math.round(
    100 *
      (0.25 * clamp(1 - Math.abs(distance - 0.8) / 1.5) +
        0.2 * clamp(1 - angle / 60) +
        0.2 * clamp(1 - speed / 2) +
        0.15 * clamp(light) +
        0.2 * (framed && visible ? 1 : 0)),
  );
  if (reasons.length) score = Math.min(59, score);
  return { score, accepted: score >= 60, reasons };
}
