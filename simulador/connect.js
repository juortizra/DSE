import qrcode from "./vendor/qrcode.mjs";
const url = new URL("./", new URL("../", location.href)).href;
const link = document.querySelector("#gameURL");
link.href = url;
link.textContent = url;
document.querySelector("#pageURL").textContent =
  "Página actual: " + location.href;
const qr = qrcode(0, "M");
qr.addData(url);
qr.make();
document.querySelector("#qr").innerHTML = qr.createSvgTag({
  cellSize: 5,
  margin: 20,
  scalable: true,
});
let registration;
async function check() {
  const lines = [
    `${isSecureContext ? "✓" : "✗"} Conexión segura: ${isSecureContext ? "sí" : "no; usa HTTPS o localhost"}`,
    `${navigator.onLine ? "✓" : "○"} Red: ${navigator.onLine ? "el navegador informa conexión (no garantiza internet)" : "sin conexión"}`,
  ];
  for (const mode of ["immersive-vr", "immersive-ar"]) {
    let ok = false;
    try {
      ok = await navigator.xr?.isSessionSupported(mode);
    } catch {}
    lines.push(
      `${ok ? "✓" : "○"} ${mode === "immersive-vr" ? "VR" : "MR"}: ${ok ? "disponible; falta probar sesión" : "no disponible en este entorno"}`,
    );
  }
  try {
    if (!isSecureContext || !("serviceWorker" in navigator))
      throw Error("service worker no disponible");
    registration = await navigator.serviceWorker.register(
      new URL("sw.js", url),
      { scope: url },
    );
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(Error("instalación incompleta: recarga con red")),
          15000,
        ),
      ),
    ]);
    const required = [
      "index.html",
      "app.js",
      "xr.js",
      "vendor/three.module.js",
      "vendor/three.core.js",
      "conectar/index.html",
      "connect.js",
      "vendor/qrcode.mjs",
    ];
    const checks = await Promise.all(
      required.map((p) =>
        caches.match(new URL(p, url), { ignoreSearch: true }),
      ),
    );
    lines.push(
      checks.every(Boolean)
        ? "✓ Sin conexión listo: archivos principales y conexión guardados."
        : "○ Caché aún incompleta: espera y vuelve a comprobar.",
    );
    document.querySelector("#refresh").hidden = !registration.waiting;
  } catch (e) {
    lines.push("○ Sin conexión no preparado: " + e.message);
  }
  document.querySelector("#environment").replaceChildren(
    ...lines.map((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    }),
  );
}
document.querySelector("#check").onclick = check;
document.querySelector("#refresh").onclick = () => {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => location.reload(),
    { once: true },
  );
  registration?.waiting?.postMessage("SKIP_WAITING");
};
check();
addEventListener("online", check);
addEventListener("offline", check);
