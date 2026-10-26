const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    headless: true,
  });
  const p = await b.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto(process.env.DSE_TEST_URL || "http://localhost:8000/");
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.context().setOffline(true);
  await p.reload();
  await p.locator("#play").click();
  await p.locator('[data-level="0"]').click();
  await p.locator("#launch").click();
  await p.locator("#checkBattery").check();
  await p.locator("#checkSD").check();
  await p.locator("#takeoff").click();
  await p.locator("#metrics").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS offline: menú, briefing y vuelo cargan desde caché sin red ni errores de consola",
  );
  await b.close();
})();
