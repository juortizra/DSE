import { CONFIG as C } from "./config.js";
import { scaleMmPerPixel } from "./measurement.js";
// Consejos a partir de la lectura y de los píxeles del detector, nunca del ancho real.
export function measurementAdvice(photo, pixels) {
  const laser = photo.sensors.laser;
  if (!laser.valid)
    return `Láser inválido: ${laser.reason || "sin retorno"}. Apunta de frente a una superficie opaca, a ${C.laser.minMm}–${C.laser.maxMm} mm; repite la foto.`;
  if (pixels < C.measurement.minPixels) {
    const limit = (laser.mm * pixels) / C.measurement.minPixels;
    const target = Math.min(
      C.laser.maxMm - C.guidance.rangeMarginMm,
      limit * C.guidance.recoveryFactor,
    );
    return `Láser válido: ${laser.mm.toFixed(0)} mm. La grieta ocupa ${pixels.toFixed(2)} px; se necesitan ${C.measurement.minPixels} px. Mínimo medible aquí: ${(C.measurement.minPixels * scaleMmPerPixel(laser.mm, photo.sensors.imu.wallAngleDeg)).toFixed(2)} mm. ${target < C.laser.minMm + C.guidance.rangeMarginMm ? "No es resoluble dentro del rango seguro configurado; requiere otro método." : `Acércate a unos ${target.toFixed(0)} mm desde la cámara, estabiliza con Shift y repite.`}`;
  }
  return "";
}
