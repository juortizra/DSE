export function cleanPreferences(p = {}) {
  const finite = (v, d, min, max) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(max, Math.max(min, v))
      : d;
  return {
    volume: finite(p.volume, 0.65, 0, 1),
    textScale: finite(p.textScale, 1, 1, 1.6),
    reduceMotion: typeof p.reduceMotion === "boolean" ? p.reduceMotion : false,
    subtitles: typeof p.subtitles === "boolean" ? p.subtitles : true,
    lowPower: typeof p.lowPower === "boolean" ? p.lowPower : false,
  };
}
export function loadPreferences(storage, reduce = false) {
  try {
    return cleanPreferences({
      reduceMotion: reduce,
      ...JSON.parse(storage.getItem("dse-preferences") || "{}"),
    });
  } catch {
    return cleanPreferences({ reduceMotion: reduce });
  }
}
