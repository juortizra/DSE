const CACHE = "dse-3b-v1";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./navigation.js",
  "./xr.js",
  "./QA-QUEST.md",
  "./world.js",
  "./config.js",
  "./sensors.js",
  "./measurement.js",
  "./detector.js",
  "./retake.js",
  "./agent.js",
  "./scoring.js",
  "./export.js",
  "./quality.js",
  "./rules.js",
  "./vendor/three.module.js",
  "./vendor/three.core.js",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("dse-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (e) => {
  if (
    e.request.method !== "GET" ||
    new URL(e.request.url).origin !== self.location.origin
  )
    return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
