const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    headless: true,
  });
  const page = await browser.newPage({
      serviceWorkers: "block",
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/app.js", async (r) => {
    const res = await r.fetch();
    await r.fulfill({
      response: res,
      body:
        (await res.text()) +
        `\nwindow.testDSE={start,rig,velocity,camera,scene,quality,capture,land,move,photos:()=>photos,points:()=>points,state:()=>({active,paused,battery}),goto(i,d=.85){chosen=i;returning=false;lastShot=-Infinity;lastImpact=-Infinity;paused=false;const p=points[i];rig.position.copy(p.position).addScaledVector(p.normal,d);yaw=Math.atan2(p.normal.x,p.normal.z);pitch=bank=tilt=0;rig.rotation.set(0,yaw,0);camera.rotation.set(0,0,0);velocity.set(0,0,0);scene.updateMatrixWorld(true);},landAtBase(){rig.position.copy(environment.base);rig.position.y=.45;velocity.set(0,0,0);land();},setLight(v){lightOn=v;lamp.intensity=v?12:0;},view:()=>({width:canvas.width,height:canvas.height}),world:()=>environment};`,
    });
  });
  for (let l = 0; l < 3; l++) {
    await page.goto(process.env.DSE_TEST_URL || "http://localhost:8000/");
    await page.locator("#play").click();
    await page.locator(`[data-level="${l}"]`).click();
    await page.locator("#launch").click();
    await page.evaluate(() => testDSE.capture());
    assert.equal(await page.evaluate(() => testDSE.photos().length), 1);
    assert.equal(
      await page.evaluate(() => testDSE.photos()[0].quality.accepted),
      false,
    );
    assert.ok(
      (await page.evaluate(() => testDSE.photos()[0].image)).length > 10000,
    );
    await page.evaluate(() => testDSE.capture());
    assert.equal(await page.evaluate(() => testDSE.photos().length), 1);
    const count = await page.evaluate(() => testDSE.points().length);
    for (let i = 0; i < count; i++) {
      await page.evaluate((i) => testDSE.goto(i), i);
      let q = await page.evaluate(() => testDSE.quality());
      if (!q.accepted && q.reasons.some((r) => r.includes("oscuro"))) {
        await page.evaluate(() => testDSE.setLight(true));
        q = await page.evaluate(() => testDSE.quality());
      }
      assert.equal(
        q.accepted,
        true,
        `level ${l} point ${i}: ${JSON.stringify(q)}`,
      );
      await page.evaluate(() => testDSE.capture());
    }
    await page.locator("#galleryBtn").click();
    assert.equal(await page.locator("#gallery article").count(), count + 1);
    await page.locator("#closeGallery").click();
    await page.evaluate(() => testDSE.landAtBase());
    await page.locator(`[data-verdict="${l}"]`).click();
    assert.match(await page.locator("#result").innerText(), /Coincide/);
    console.log(
      `PASS nivel ${l}: ${count} aceptadas + rechazo + cooldown + galería + análisis + veredicto`,
    );
  }
  await page.goto(process.env.DSE_TEST_URL || "http://localhost:8000/");
  await page.evaluate(() => testDSE.start(0));
  const y = await page.evaluate(() => testDSE.rig.position.y);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(900);
  const roll = await page.evaluate(() => {
    for (let i = 0; i < 30; i++) testDSE.move(0.03);
    return testDSE.camera.rotation.x;
  });
  assert.ok(Math.abs(roll) > 0.01);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(1500);
  assert.ok(
    Math.abs((await page.evaluate(() => testDSE.rig.position.y)) - y) < 0.01,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS vuelo: inclinación, mantenimiento de altura, cero errores JS",
  );
  await browser.close();
})();
