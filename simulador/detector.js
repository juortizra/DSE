import { CONFIG as C } from "./config.js";
import { oraclePixels, measureCrack } from "./measurement.js";
// Interfaz reemplazable: detect(photo, reference, sceneReference) -> Promise<DetectionResult>.
// Solo este adaptador sintético recibe truth. Un adaptador de IA real no la recibiría.
export class SimulatedDetector {
  constructor(random = Math.random) {
    this.random = random;
  }
  async detect(photo, reference, sceneReference) {
    const good = photo.quality.accepted,
      pixels = oraclePixels(reference),
      miss =
        pixels < C.measurement.minPixels ||
        (!good && this.random() < C.detector.falseNegativePoorRate);
    const detections = [];
    if (!miss) {
      const px = Math.max(
          0,
          pixels + (this.random() * 2 - 1) * C.detector.pixelPerturbation,
        ),
        measure = measureCrack({
          pixels: px,
          laser: photo.sensors.laser,
          angleDeg: photo.sensors.imu.wallAngleDeg,
          angleErrorDeg: photo.sensors.imu.wallAngleErrorDeg,
        });
      detections.push({
        kind: "grieta",
        element: photo.point,
        pixels: px,
        box: reference.box ?? C.detector.box,
        measure,
      });
    }
    if (this.random() < C.detector.falsePositiveRate)
      detections.push({
        kind: "posible sombra/mancha",
        element: photo.point,
        pixels: C.measurement.minPixels,
        box: C.detector.falseBox,
        measure: measureCrack({
          pixels: C.measurement.minPixels,
          laser: photo.sensors.laser,
          angleDeg: photo.sensors.imu.wallAngleDeg,
          angleErrorDeg: photo.sensors.imu.wallAngleErrorDeg,
        }),
        suspect: true,
      });
    const observations =
      good && !photo.inside
        ? {
            collapse: sceneReference.collapse,
            softCollapse: sceneReference.softCollapse,
            tiltDeg: Math.max(
              0,
              sceneReference.tiltDeg +
                ((this.random() * 2 - 1) * C.imu.attitudeErrorDeg) / 4,
            ),
            threat: sceneReference.threat,
          }
        : {};
    return {
      photoId: photo.id,
      point: photo.point,
      quality: photo.preReplica ? 0 : photo.quality.score,
      detections,
      observations,
      miss,
      model: "Simulación del modelo de IA liviano del proyecto",
    };
  }
}
