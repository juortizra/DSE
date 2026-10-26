import { CONFIG as C } from "./config.js";
const clamp = (x) => Math.max(0, Math.min(1, x));
export function scoreSession({
  expected,
  decision,
  coverage,
  quality,
  stats,
  photoCount,
  goodCount,
}) {
  const critical = expected === 2 && decision === 0;
  let decisionPoints =
    decision === null
      ? 0
      : decision === expected
        ? C.score.decision
        : decision > expected
          ? decision - expected === 1
            ? C.score.overOne
            : C.score.overTwo
          : C.score.underOne;
  if (critical) decisionPoints = 0;
  const photography = C.score.photo * clamp(coverage) * clamp(quality),
    flights = Math.max(1, stats.flights),
    energy = clamp(1 - stats.batteryUsed / (100 * flights)),
    time = clamp(1 - stats.seconds / (C.battery.flightSeconds * flights)),
    storage = photoCount ? clamp(goodCount / photoCount) : 0;
  const efficiency = (C.score.efficiency * (energy + time + storage)) / 3,
    safety =
      C.score.safety *
      clamp(
        1 -
          stats.crashes -
          C.score.contactPenalty * stats.contacts -
          C.score.boundaryPenalty * stats.boundaries,
      );
  return {
    total: critical
      ? 0
      : Math.round(decisionPoints + photography + efficiency + safety),
    critical,
    decision: decisionPoints,
    photography,
    efficiency,
    safety,
  };
}
