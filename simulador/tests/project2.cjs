const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
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
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/app.js", async (route) => {
    const res = await route.fetch();
    await route.fulfill({
      response: res,
      body:
        (await res.text()) +
        `\nwindow.p2={start,capture,quality,finish,land,preflight,photos:()=>photos,agent:()=>agentResult,truth:()=>truth,state:()=>({active,calibrated,battery,sortie,flightSeconds}),fast(){renderer.shadowMap.enabled=false;renderer.setPixelRatio(.5);renderer.setSize(800,600);Math.random=()=>.5;C.ground.minProcessMs=0;C.ground.maxProcessMs=0;difficultyKey='aprendiz';},pose(i=0,d=.06){chosen=i;returning=false;lastShot=-Infinity;lastImpact=-Infinity;paused=false;lightOn=true;lamp.intensity=12;const p=points[i];yaw=Math.atan2(p.normal.x,p.normal.z);pitch=bank=tilt=0;rig.rotation.set(0,yaw,0);camera.rotation.set(0,0,0);rig.position.copy(p.position).addScaledVector(p.normal,d+C.camera.offsetM);velocity.set(0,0,0);sensorCache=null;scene.updateMatrixWorld(true);},base(){rig.position.copy(environment.base);rig.position.y=.45;velocity.set(0,0,0);paused=false;land();},quake(){quakeEnabled=true;quakeDone=false;flightSeconds=C.quake.atSeconds;extras(.02);return photos.every(p=>p.preReplica)&&points.every(p=>!p.best);},energy(){battery=0;const y=rig.position.y;move(.05);return rig.position.y<y||!active;}};`,
    });
  });
  const url = process.env.DSE_TEST_URL || "http://localhost:8000/";
  for (const level of (process.env.DSE_LEVELS || "0,1,2")
    .split(",")
    .map(Number)) {
    await page.goto(url);
    await page.locator("#play").click();
    await page.locator('[data-level="' + level + '"]').click();
    await page.locator("#launch").click();
    await page.locator("#checkBattery").check();
    await page.locator("#checkSD").check();
    if (level === 0) {
      await page.locator("#calibrate").click();
      await page.waitForFunction(() =>
        document.querySelector("#calState")?.textContent.includes("terminada"),
      );
    }
    await page.locator("#takeoff").click();
    await page.evaluate(() => p2.fast());
    if (level === 0)
      assert.equal(await page.evaluate(() => p2.state().calibrated), true);
    for (let i = 0; i < 7; i++) {
      await page.evaluate((i) => p2.pose(i), i);
      const q = await page.evaluate(() => p2.quality());
      assert.equal(q.accepted, true, JSON.stringify({ level, i, q }));
      const before = Date.now();
      await page.evaluate(() => p2.capture());
      const packet = await page.evaluate(() => {
        const p = p2.photos().at(-1);
        return {
          timeMs: p.timeMs,
          s: p.sensors,
          accepted: p.quality.accepted,
          hasTruth: "width" in p || "distanceMm" in p,
        };
      });
      assert.equal(packet.accepted, true);
      assert.equal(packet.hasTruth, false);
      for (const t of [
        packet.s.timeMs,
        packet.s.laser.timeMs,
        packet.s.imu.timeMs,
        packet.s.battery.timeMs,
      ])
        assert.equal(t, packet.timeMs);
      assert.ok(packet.timeMs >= before + 140);
    }
    assert.equal(await page.evaluate(() => p2.photos().length), 7);
    const dimensions = await page.evaluate(async () => {
      const i = new Image();
      i.src = p2.photos()[0].image;
      await i.decode();
      return [i.naturalWidth, i.naturalHeight];
    });
    assert.deepEqual(dimensions, [1280, 720]);
    await page.evaluate(() => p2.base());
    await page.waitForFunction(() =>
      document.querySelector("#groundSummary h2"),
    );
    const a = await page.evaluate(() => p2.agent());
    assert.equal(a.verdict, level, JSON.stringify(a));
    await page.locator('[data-verdict="' + level + '"]').click();
    await page.locator("#downloadSession").waitFor();
    assert.match(await page.locator("#result").innerText(), /Puntaje/);
    console.log(
      "PASS nivel",
      level,
      "prevuelo, siete fotos sincronizadas 1280x720, TFT, agente, decisión e informe",
    );
    if (level === 2) {
      const downloading = page.waitForEvent("download");
      await page.locator("#downloadSession").click();
      const d = await downloading;
      await d.saveAs("/tmp/dse-session-test.zip");
    }
  }
  // La inspección incompleta es una salida normal, no una excepción ni un verde implícito.
  await page.goto(url);
  await page.evaluate(() => {
    p2.fast();
    p2.start(0);
  });
  await page.evaluate(() => p2.capture());
  assert.equal(
    await page.evaluate(() => p2.photos()[0].quality.accepted),
    false,
  );
  await page.evaluate(() => p2.base());
  await page.waitForFunction(() => document.querySelector("#secondSortie"));
  assert.equal(await page.evaluate(() => p2.agent().label), "INDETERMINADO");
  await page.locator("#secondSortie").click();
  await page.locator("#checkBattery").check();
  await page.locator("#checkSD").check();
  await page.locator("#takeoff").click();
  assert.equal(await page.evaluate(() => p2.photos().length), 1);
  assert.equal(await page.evaluate(() => p2.state().sortie), 2);
  await page.evaluate(() => p2.pose());
  await page.evaluate(() => p2.capture());
  assert.equal(await page.evaluate(() => p2.photos().length), 2);
  assert.equal(await page.evaluate(() => p2.quake()), true);
  assert.equal(await page.evaluate(() => p2.energy()), true);
  console.log(
    "PASS indeterminado, segunda salida con archivo conservado, réplica y descenso automático",
  );
  assert.deepEqual(errors, []);
  await browser.close();
})();
