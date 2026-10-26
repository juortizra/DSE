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
  });
  try {
    const context = await browser.newContext({
        viewport: { width: 1100, height: 800 },
      }),
      p = await context.newPage(),
      issues = [],
      external = [];
    const url = process.env.DSE_TEST_URL || "http://localhost:8000/";
    p.on("pageerror", (e) => issues.push(e.message));
    p.on("console", (m) => {
      if (["error", "warning"].includes(m.type()))
        issues.push(m.type() + ": " + m.text());
    });
    p.on("request", (r) => {
      if (new URL(r.url()).origin !== new URL(url).origin)
        external.push(r.url());
    });
    await p.goto(url);
    await p.locator("#demo").waitFor();
    assert.ok(await p.locator("#xr").isHidden());
    assert.ok(await p.locator("#mr").isHidden());
    await p.locator("#about").click();
    assert.ok(
      (await p.locator("#aboutProject").innerText()).includes("ODS 11"),
    );
    await p.locator("#aboutProject button").click();
    await p.locator("#controlsBtn").click();
    await p.locator("#lowPower").check();
    await p.locator("#reduceMotion").check();
    await p.locator("#volume").fill("0");
    await p.locator("#textSize").fill("1.2");
    await p.locator("#controlsDialog button").click();
    await p.locator("#demo").click();
    await p.locator("#takeControl").click();
    assert.ok(await p.locator("#demoBar").isHidden());
    assert.ok(await p.locator("#metrics").isVisible());
    await p.reload();
    assert.equal(await p.locator("#volume").inputValue(), "0");
    assert.equal(await p.locator("#textSize").inputValue(), "1.2");
    await p.goto(new URL("conectar/", url).href);
    await p.waitForFunction(() =>
      document
        .querySelector("#environment")
        .textContent.includes("Sin conexión listo"),
    );
    assert.ok(await p.locator("#qr svg").isVisible());
    assert.equal(
      await p.locator("#gameURL").textContent(),
      new URL("./", url).href,
    );
    await context.setOffline(true);
    await p.reload();
    await p.locator("#qr svg").waitFor();
    await p.goto(new URL("conectar", url).href);
    await p.locator("#qr svg").waitFor();
    assert.ok(p.url().includes("/conectar/"));
    await p.goto(url + "?prueba=offline");
    await p.locator("#play").click();
    await p.locator('[data-level="0"]').click();
    await p.locator("#launch").click();
    await p.locator("#checkBattery").check();
    await p.locator("#checkSD").check();
    await p.locator("#takeoff").click();
    await p.locator("#metrics").waitFor();
    assert.ok(await p.locator("#xr").isHidden());
    assert.deepEqual(issues, []);
    assert.deepEqual(external, []);
    console.log(
      "PASS inicio/acerca/controles, preferencias persistentes, sin XR, QR local, caché/query offline, vuelo y cero errores/advertencias/peticiones externas",
    );
    await context.setOffline(false);
    await context.close();
    // Fallo de sesión y reducción de funciones, sin emular render de unas gafas reales.
    const fake = await browser.newContext();
    await fake.addInitScript(() => {
      let attempts = [];
      Object.defineProperty(navigator, "xr", {
        value: {
          isSessionSupported: async () => true,
          requestSession: async (m, o) => {
            attempts.push(o);
            throw new DOMException(
              "Funciones no disponibles",
              "NotSupportedError",
            );
          },
        },
      });
      window.xrAttempts = attempts;
    });
    const q = await fake.newPage();
    await q.goto(url);
    await q.locator("#play").click();
    await q.locator('[data-level="0"]').click();
    await q.locator("#launch").click();
    await q.locator("#checkBattery").check();
    await q.locator("#checkSD").check();
    await q.locator("#takeoff").click();
    await q.locator("#xr").click();
    await q.waitForFunction(() => window.xrAttempts.length === 3);
    assert.equal(await q.locator("#metrics").isVisible(), true);
    assert.ok(
      (await q.locator("#message").textContent()).includes("juego normal"),
    );
    console.log(
      "PASS XR rechazado: 3 intentos degradados, vuelo normal conservado (mock, no hardware)",
    );
    await fake.close();

    const cycle = await browser.newPage();
    await cycle.goto(url);
    const result = await cycle.evaluate(async () => {
      const T = await import("./vendor/three.module.js"),
        { createXR } = await import("./xr.js");
      let current,
        rt = null,
        fail = false,
        inputs = [],
        focus = [],
        resources = 0;
      const groups = [
        new T.Group(),
        new T.Group(),
        new T.Group(),
        new T.Group(),
      ];
      const left = {
        handedness: "left",
        gamepad: {
          axes: [0, 0, 0.3, -0.4],
          buttons: Array.from({ length: 6 }, () => ({ pressed: false })),
        },
      };
      const makeSession = () => {
        const s = new EventTarget();
        s.visibilityState = "visible";
        s.inputSources = [left];
        s.requestReferenceSpace = async () => ({});
        s.end = async () => s.dispatchEvent(new Event("end"));
        return s;
      };
      Object.defineProperty(navigator, "xr", {
        configurable: true,
        value: { requestSession: async () => (current = makeSession()) },
      });
      const r = {
        xr: {
          enabled: true,
          setReferenceSpaceType() {},
          setSession: async () => {},
          getControllerGrip: (i) => groups[i * 2],
          getController: (i) => groups[i * 2 + 1],
          getReferenceSpace: () => ({}),
        },
        getRenderTarget: () => rt,
        setRenderTarget: (t) => (rt = t),
        render() {
          if (fail) throw Error("render de prueba");
        },
      };
      const world = new T.Group(),
        scene = new T.Scene(),
        cam = new T.PerspectiveCamera();
      cam.position.set(3, 2, 1);
      scene.add(cam);
      const initial = cam.position.toArray().join(",");
      const before = scene.children.length;
      const api = {
        world: () => world,
        position: () => new T.Vector3(),
        mode() {},
        clear() {},
        message() {},
        input: (v) => inputs.push(v),
        focus: (v) => focus.push(v),
        photo() {},
        home() {},
        awaitingSD: () => false,
        flying: () => true,
        review: () => null,
        confirm() {},
        insert() {},
        crashed: () => false,
        hud: () => ["Prueba"],
      };
      const x = createXR(T, r, scene, cam, api);
      for (const mode of ["immersive-vr", "immersive-ar"]) {
        await x.enter(mode);
        x.frame(0.1, { getPose: () => null });
        if (inputs.at(-1).alt !== 0.4) throw Error("Mapeo stick");
        current.visibilityState = "hidden";
        current.dispatchEvent(new Event("visibilitychange"));
        x.frame(0.1, {});
        if (focus.at(-1) !== false) throw Error("Foco");
        current.visibilityState = "visible";
        current.dispatchEvent(new Event("visibilitychange"));
        x.frame(0.1, {});
        if (focus.at(-1) !== true) throw Error("Recuperación");
        fail = true;
        let restored = false;
        try {
          x.frame(0.1, {});
        } catch {
          restored = r.xr.enabled && rt === null;
        }
        fail = false;
        if (!restored) throw Error("Restauración de XR/target tras fallo");
        await x.exit();
        if (
          x.active ||
          scene.children.length !== before ||
          groups.some((g) => g.children.length)
        )
          throw Error("Limpieza XR");
        if (cam.position.toArray().join(",") !== initial)
          throw Error("Cámara del sensor alterada");
      }
      return true;
    });
    assert.equal(result, true);
    await cycle.close();
    console.log(
      "PASS ciclo VR/MR con renderer/sesión simulados: sticks, foco, restauración tras fallo, cámara independiente y limpieza. No verifica gafas.",
    );

    if (process.env.DSE_TEST_DEMO === "1") {
      const dc = await browser.newContext({
        viewport: { width: 900, height: 650 },
      });
      await dc.addInitScript(() =>
        localStorage.setItem(
          "dse-preferences",
          JSON.stringify({ lowPower: true, volume: 0 }),
        ),
      );
      const d = await dc.newPage(),
        err = [];
      d.on("pageerror", (e) => err.push(e.message));
      const start = Date.now();
      await d.goto(url);
      await d.evaluate(() => navigator.serviceWorker.ready);
      await dc.setOffline(true);
      await d.reload();
      await d.locator("#demo").click();
      await d.waitForFunction(
        () =>
          document.querySelector("#result h3")?.textContent.includes("Puntaje"),
        {},
        { timeout: 240000 },
      );
      assert.ok(
        (await d.locator("#groundSummary").innerText()).includes("100%"),
      );
      assert.ok((await d.locator(".verdict-symbol").count()) > 0);
      assert.deepEqual(err, []);
      assert.equal(
        await d.evaluate(() => localStorage.getItem("dse-progress")),
        null,
      );
      console.log(
        "PASS demostración sin red ni intervención, 7/7, informe y sin progreso acreditado: " +
          Math.round((Date.now() - start) / 1000) +
          " s",
      );
      await dc.close();
    }
  } finally {
    await browser.close();
  }
})();
