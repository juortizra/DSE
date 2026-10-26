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
    await p.route("**/app.js", async (route) => {
      const res = await route.fetch();
      await route.fulfill({
        response: res,
        body:
          (await res.text()) +
          `\nwindow.lr={start,capture,photos:()=>photos,agent:()=>agentResult,setup(l){renderer.shadowMap.enabled=false;renderer.setPixelRatio(.5);C.ground.minProcessMs=C.ground.maxProcessMs=0;difficultyKey='aprendiz';start(l);},pose(i,d){chosen=i;lastShot=lastImpact=-Infinity;paused=false;lightOn=true;lamp.intensity=12;const p=points[i];rig.position.copy(p.position).addScaledVector(p.normal,d+C.camera.offsetM);yaw=pitch=bank=tilt=0;rig.rotation.set(0,0,0);camera.rotation.set(0,0,0);velocity.set(0,0,0);sensorCache=null;scene.updateMatrixWorld(true);},stale(){let packet;for(let i=0;i<30;i++){packet=readSensors();if(packet.laser.valid)break;}sensorCache={laser:{valid:false,reason:'Lectura anterior inválida'}};lastSensorMs=performance.now();return {fresh:packet.laser.valid,q:quality(packet.laser)};},probe(){const values=[];for(let i=0;i<20;i++){const l=readSensors().laser;if(l.valid)values.push(l);}return values;},base(){rig.position.copy(environment.base);rig.position.y=.45;velocity.set(0,0,0);land();}};`,
      });
    });
    const url = process.env.DSE_TEST_URL || "http://localhost:8000/";
    for (let level = 0; level < 3; level++) {
      await p.goto(url);
      await p.evaluate((l) => lr.setup(l), level);
      const distance = [0.06, 0.3, 0.6][level];
      for (let i = 0; i < 7; i++) {
        await p.evaluate(([i, d]) => lr.pose(i, d), [i, distance]);
        const reads = await p.evaluate(() => lr.probe());
        assert.ok(reads.length >= 8, "Retornos válidos insuficientes");
        for (const r of reads)
          assert.ok(
            Math.abs(r.mm - (distance * 1000 + 0.5)) <= r.errorMm + 2,
            JSON.stringify({ level, i, r, distance }),
          );
        if (level === 0 && i === 0) {
          const q = await p.evaluate(() => lr.stale());
          assert.equal(q.fresh, true);
          assert.equal(
            q.q.accepted,
            true,
            "La lectura anterior no debe rechazar la exposición válida",
          );
        }
        let accepted = false;
        for (let retry = 0; retry < 10 && !accepted; retry++) {
          await p.evaluate(([i, d]) => lr.pose(i, d), [i, distance]);
          await p.evaluate(() => lr.capture());
          accepted = await p.evaluate(
            () => lr.photos().at(-1).quality.accepted,
          );
        }
        assert.ok(accepted, `No se logró foto válida ${level}/${i}`);
      }
      await p.evaluate(() => lr.base());
      await p.waitForFunction(() =>
        document.querySelector("#groundSummary h2"),
      );
      const a = await p.evaluate(() => lr.agent());
      assert.equal(a.verdict, level, JSON.stringify(a));
      console.log(
        "PASS láser real aleatorio: nivel",
        level,
        "7 puntos, distancia correcta, exposición coherente, veredicto",
        a.label,
      );
    }
    await p.goto(url);
    await p.evaluate(() => {
      lr.setup(0);
      lr.pose(0, 0.8);
    });
    for (let i = 0; i < 10; i++) {
      await p.evaluate(() => lr.pose(0, 0.8));
      await p.evaluate(() => lr.capture());
      if (await p.evaluate(() => lr.photos().at(-1).quality.accepted)) break;
    }
    assert.ok(await p.evaluate(() => lr.photos().at(-1).sensors.laser.valid));
    await p.evaluate(() => lr.base());
    await p.waitForFunction(() => document.querySelector("#groundSummary h2"));
    assert.equal(await p.evaluate(() => lr.agent().label), "INDETERMINADO");
    assert.match(await p.locator("#groundSummary").innerText(), /Láser válido/);
    assert.match(await p.locator("#processed").innerText(), /px/);
    assert.deepEqual(errors, []);
    console.log(
      "PASS a 800 mm: lectura válida, fisura no resoluble explicada y sin veredicto forzado",
    );
  } finally {
    await b.close();
  }
})();
