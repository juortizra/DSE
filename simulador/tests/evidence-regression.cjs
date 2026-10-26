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
  try {
    const p = await b.newPage({
        serviceWorkers: "block",
        viewport: { width: 1200, height: 900 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await p.route("**/app.js", async (r) => {
      const a = await r.fetch();
      await r.fulfill({
        response: a,
        body:
          (await a.text()) +
          `\nwindow.er={setup(l){renderer.shadowMap.enabled=false;renderer.setPixelRatio(.5);C.ground.minProcessMs=C.ground.maxProcessMs=0;difficultyKey='aprendiz';start(l);},pose(i,d){chosen=i;lastShot=lastImpact=-Infinity;paused=false;lightOn=true;lamp.intensity=12;const p=points[i];rig.position.copy(p.position).addScaledVector(p.normal,d+C.camera.offsetM);yaw=pitch=bank=tilt=0;rig.rotation.set(0,0,0);camera.rotation.set(0,0,0);velocity.set(0,0,0);sensorCache=null;scene.updateMatrixWorld(true);},capture,photos:()=>photos,agent:()=>agentResult,base(){rig.position.copy(environment.base);rig.position.y=.45;velocity.set(0,0,0);land();}};`,
      });
    });
    for (const [level, distance, expected] of [
      [0, 0.8, 1],
      [1, 0.8, 1],
      [2, 0.8, 2],
      [0, 0.2, 0],
    ]) {
      await p.goto(process.env.DSE_TEST_URL || "http://localhost:8000/");
      await p.evaluate((l) => er.setup(l), level);
      for (let i = 0; i < 7; i++) {
        let good = false;
        for (let retry = 0; retry < 10 && !good; retry++) {
          await p.evaluate(([i, d]) => er.pose(i, d), [i, distance]);
          await p.evaluate(() => er.capture());
          good = await p.evaluate(() => er.photos().at(-1).quality.accepted);
        }
        assert.ok(good, "No se logró foto aceptada");
      }
      await p.evaluate(() => er.base());
      await p.waitForFunction(() =>
        document.querySelector("#groundSummary h2"),
      );
      const a = await p.evaluate(() => er.agent());
      assert.equal(a.coverage, 1);
      assert.equal(a.missing.length, 0, JSON.stringify(a));
      assert.equal(a.verdict, expected, JSON.stringify(a));
      assert.equal(await p.locator('[data-verdict="0"]').isEnabled(), true);
      assert.equal(await p.locator('[data-verdict="1"]').isEnabled(), true);
      assert.equal(await p.locator('[data-verdict="2"]').isEnabled(), true);
      if (level === 0 && distance === 0.8) {
        assert.equal(a.measurementWarnings.length, 7);
        assert.equal(a.measuredPoints, 0);
        assert.ok(a.rules.some((r) => r.id === "resolucion-precaucion"));
        assert.ok(await p.locator("#secondSortie").isVisible());
        await p.locator('[data-verdict="1"]').click();
        assert.ok(await p.locator("#downloadSession").isVisible());
      }
      console.log(
        `PASS nivel ${level}, ${distance} m: cobertura 7/7, ${a.measuredPoints} anchos, ${a.label}; decisión disponible`,
      );
    }
    await p.goto(process.env.DSE_TEST_URL || "http://localhost:8000/");
    await p.evaluate(() => {
      er.setup(0);
      er.base();
    });
    await p.waitForFunction(() => document.querySelector("#groundSummary h2"));
    assert.equal(await p.evaluate(() => er.agent().label), "INDETERMINADO");
    assert.ok(await p.locator("#secondSortie").isVisible());
    assert.deepEqual(errors, []);
    console.log(
      "PASS sin inspección: INDETERMINADO, sin verde inventado y con segunda salida",
    );
  } finally {
    await b.close();
  }
})();
