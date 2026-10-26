const CACHE = "dse-3d-v1";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./navigation.js",
  "./xr.js",
  "./preferences.js",
  "./CREDITOS.md",
  "./conectar/index.html",
  "./connect.js",
  "./vendor/qrcode.mjs",
  "./vendor/LICENSE-qrcode.txt",
  "./vendor/LICENSE-three.txt",
  "./README.md",
  "./VERIFICAR.md",
  "./icon.svg",
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
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(async (r) => {
      if (r) return r;
      const u = new URL(e.request.url);
      if (u.pathname.endsWith("/conectar")) {
        u.pathname += "/";
        return Response.redirect(u.href, 302);
      }
      if (u.pathname.endsWith("/")) {
        const page = await caches.match(new URL("index.html", u), {
          ignoreSearch: true,
        });
        if (page) return page;
      }
      return fetch(e.request);
    }),
  );
});
