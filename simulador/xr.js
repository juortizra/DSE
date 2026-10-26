import { CONFIG as C } from "./config.js";
// WebXR progresivo. Las escenas del operador y del dron son independientes.
export function createXR(T, renderer, flight, droneCamera, api) {
  let session = null,
    mode = null,
    root = null,
    view = null,
    screen = null,
    target = null,
    hit = null,
    table = null,
    model = null,
    mini = null,
    unit = null,
    sd = null,
    grabbing = null,
    scaleStart = null,
    visible = true,
    immersive = false,
    elapsed = 0,
    flash = 0,
    carrier = null,
    mask = null,
    unitCanvas = null,
    unitTexture = null,
    hadController = false,
    lastFocus = true;
  let lastCrash = false;
  let fpvCamera = null;
  let floorSpace = null,
    floorPlaced = false;
  let hudCanvas = null,
    hudTexture = null,
    lastHUD = -Infinity,
    lastVideo = -Infinity;
  let owned = [],
    listeners = [],
    pressed = new Map(),
    grips = [],
    visuals = [],
    panelCanvas = null,
    panelTexture = null;
  const own = (o) => {
    owned.push(o);
    return o;
  };
  const bind = (o, e, f) => {
    o.addEventListener(e, f);
    listeners.push(() => o.removeEventListener(e, f));
  };
  const box = (w, h, d, color) =>
    new T.Mesh(
      own(new T.BoxGeometry(w, h, d)),
      own(new T.MeshStandardMaterial({ color })),
    );
  const requestOptions = [
    {
      optionalFeatures: [
        "local-floor",
        "hit-test",
        "anchors",
        "hand-tracking",
        "dom-overlay",
      ],
      domOverlay: { root: document.body },
    },
    { optionalFeatures: ["local-floor"] },
    {},
  ];
  async function supported() {
    let any = false;
    for (const [id, m] of [
      ["xr", "immersive-vr"],
      ["mr", "immersive-ar"],
    ]) {
      const b = document.getElementById(id);
      b.hidden = true;
      try {
        b.hidden = !(await navigator.xr?.isSessionSupported(m));
        any ||= !b.hidden;
      } catch {}
    }
    if (!any)
      document.getElementById("xrStatus").textContent =
        "WebXR no disponible: juega normalmente en pantalla.";
  }
  function dispose() {
    try {
      hit?.cancel();
    } catch {}
    hit = null;
    floorSpace = null;
    floorPlaced = false;
    listeners.splice(0).forEach((f) => f());
    visuals.forEach((v) => v.removeFromParent());
    visuals = [];
    grips.forEach((g) => g.removeFromParent());
    ((grips = []), (visuals = []), (panelCanvas = null), (panelTexture = null));
    root?.clear();
    view?.parent?.remove(view);
    carrier?.removeFromParent();
    mask?.removeFromParent();
    target?.dispose();
    fpvCamera = null;
    hudCanvas = hudTexture = null;
    lastHUD = lastVideo = -Infinity;
    hadController = false;
    lastFocus = true;
    lastCrash = false;
    owned.splice(0).forEach((o) => o.dispose());
    owned = [];
    pressed.clear();
    grabbing = null;
    scaleStart = null;
    session = null;
    mode = null;
    table = model = mini = unit = sd = null;
    unitCanvas = unitTexture = null;
    carrier = mask = null;
    api.mode(null);
    api.input({});
    api.clear();
    api.message("Sesión XR finalizada. Continúa en pantalla.");
    document.getElementById("exitXR").hidden = true;
    document.getElementById("insertSD").hidden = true;
  }
  async function enter(m) {
    if (session) return;
    let created = null;
    try {
      for (const options of requestOptions) {
        try {
          created = await navigator.xr.requestSession(m, options);
          break;
        } catch (e) {
          if (e.name === "NotAllowedError" || e.name === "SecurityError")
            throw e;
        }
      }
      if (!created)
        throw Error("No se pudo iniciar ni con características mínimas.");
      session = created;
      mode = m;
      visible = session.visibilityState !== "hidden";
      document.exitPointerLock?.();
      api.clear();
      api.mode(m);
      root = new T.Scene();
      root.background = m === "immersive-ar" ? null : new T.Color("#18232b");
      root.add(new T.HemisphereLight(0xffffff, 0x555555, 3));
      view = new T.PerspectiveCamera(60, 1, 0.02, 200);
      root.add(view);
      renderer.xr.setFramebufferScaleFactor?.(C.xr.framebufferScale);
      renderer.xr.setFoveation?.(1);
      target = new T.WebGLRenderTarget(960, 540);
      fpvCamera = new T.PerspectiveCamera(
        droneCamera.fov,
        16 / 9,
        droneCamera.near,
        droneCamera.far,
      );
      panelCanvas = document.createElement("canvas");
      panelCanvas.width = 960;
      panelCanvas.height = 540;
      panelTexture = own(new T.CanvasTexture(panelCanvas));
      screen = new T.Mesh(
        own(
          new T.PlaneGeometry(
            C.xr.monitorWidthM,
            (C.xr.monitorWidthM * 9) / 16,
          ),
        ),
        own(new T.MeshBasicMaterial({ map: target.texture })),
      );
      screen.position.set(0, -0.05, -C.xr.monitorDistanceM);
      root.add(screen);
      hudCanvas = document.createElement("canvas");
      hudCanvas.width = 1200;
      hudCanvas.height = 240;
      hudTexture = own(new T.CanvasTexture(hudCanvas));
      const hudMesh = new T.Mesh(
        own(new T.PlaneGeometry(C.xr.monitorWidthM, 0.24)),
        own(new T.MeshBasicMaterial({ map: hudTexture, toneMapped: false })),
      );
      hudMesh.position.set(0, -0.52, -C.xr.monitorDistanceM);
      root.add(hudMesh);
      if (m === "immersive-ar") {
        table = new T.Group();
        table.position.set(0, C.xr.tableHeightM - C.xr.assumedEyeHeightM, -1.2);
        root.add(table);
        model = api.world().clone(true);
        model.scale.setScalar(C.xr.maquetteScale);
        table.add(model);
        mini = box(0.5, 0.18, 0.5, 0xffd350);
        model.add(mini);
        unit = box(0.22, 0.12, 0.13, 0x276e65);
        unit.position.set(0.48, 0.06, 0);
        table.add(unit);
        sd = box(0.05, 0.004, 0.035, 0xffd350);
        sd.position.set(0.65, 0.03, 0);
        table.add(sd);
        unitCanvas = document.createElement("canvas");
        unitCanvas.width = 320;
        unitCanvas.height = 240;
        unitTexture = own(new T.CanvasTexture(unitCanvas));
        const display = new T.Mesh(
          own(new T.PlaneGeometry(0.18, 0.1)),
          own(new T.MeshBasicMaterial({ map: unitTexture })),
        );
        display.rotation.x = -Math.PI / 2;
        display.position.set(0.48, 0.122, 0);
        table.add(display);
        screen.position.set(0, -0.05, -C.xr.monitorDistanceM);
      }
      carrier = new T.Group();
      carrier.position.copy(droneCamera.getWorldPosition(new T.Vector3()));
      carrier.quaternion.copy(
        droneCamera.getWorldQuaternion(new T.Quaternion()),
      );
      flight.add(carrier);
      mask = new T.Mesh(
        own(new T.PlaneGeometry(2, 2)),
        own(
          new T.ShaderMaterial({
            transparent: true,
            depthTest: false,
            depthWrite: false,
            uniforms: { amount: { value: 0 }, black: { value: 0 } },
            vertexShader:
              "varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}",
            fragmentShader:
              "varying vec2 v;uniform float amount;uniform float black;void main(){float a=max(black,smoothstep(.35,.95,length(v-.5)*2.)*amount);gl_FragColor=vec4(0.,0.,0.,a);}",
          }),
        ),
      );
      mask.frustumCulled = false;
      mask.renderOrder = 10000;
      renderer.xr.setReferenceSpaceType("local");
      bind(session, "end", dispose);
      bind(session, "visibilitychange", () => {
        visible = session.visibilityState === "visible";
        if (!visible && lastFocus) {
          lastFocus = false;
          api.focus(false);
          api.input({});
        }
        api.clear();
      });
      await renderer.xr.setSession(session);
      if (m === "immersive-ar") {
        try {
          floorSpace = await session.requestReferenceSpace("local-floor");
        } catch {
          floorSpace = null;
        }
      }
      if (m === "immersive-ar" && session.requestHitTestSource) {
        try {
          hit = await session.requestHitTestSource({
            space: await session.requestReferenceSpace("viewer"),
          });
        } catch {
          api.message(
            "Sin detección de mesa: maqueta delante, a altura estimada de 80 cm.",
          );
        }
      }
      for (let i = 0; i < 2; i++) {
        const g = renderer.xr.getControllerGrip(i),
          c = renderer.xr.getController(i);
        root.add(g, c);
        grips.push(g, c);
        const handle = box(0.035, 0.035, 0.1, 0xf2d16b);
        g.add(handle);
        visuals.push(handle);
        bind(c, "selectstart", () => {
          if (mode === "immersive-ar" && api.awaitingSD()) {
            api.insert();
            return;
          }
          api.photo();
        });
        bind(c, "squeezestart", () => {
          if (mode !== "immersive-ar") return;
          const pos = g.getWorldPosition(new T.Vector3());
          if (
            pos.distanceTo(sd.getWorldPosition(new T.Vector3())) <
            C.xr.sdGripDistanceM
          ) {
            grabbing = { type: "sd", g };
            g.attach(sd);
          } else if (pos.distanceTo(table.position) < 1.5) {
            grabbing = {
              type: "table",
              g,
              offset: table.position.clone().sub(pos),
            };
          }
        });
        bind(c, "squeezeend", () => {
          if (grabbing?.g !== g) return;
          if (grabbing.type === "sd") {
            const near =
              sd
                .getWorldPosition(new T.Vector3())
                .distanceTo(unit.getWorldPosition(new T.Vector3())) <
              C.xr.sdInsertDistanceM;
            table.attach(sd);
            sd.position.set(0.65, 0.03, 0);
            if (near) api.insert();
          }
          grabbing = null;
          scaleStart = null;
        });
      }
      document.getElementById("exitXR").hidden = false;
      api.message(
        m === "immersive-ar"
          ? "MR: apunta al plano y pulsa A para colocar; agarre mueve la maqueta, dos agarres escalan."
          : "VR: monitor FPV estable. Controles de mando remoto.",
      );
    } catch (e) {
      if (created) {
        await created.end().catch(() => {});
        if (session) dispose();
      }
      api.mode(null);
      api.message(
        "No se pudo iniciar XR: " +
          e.message +
          ". El juego normal sigue disponible.",
      );
    }
  }
  function edge(key, value, fn) {
    if (value && !pressed.get(key)) fn();
    pressed.set(key, value);
  }
  function frame(dt, frame) {
    if (!session) return false;
    elapsed += dt;
    const crashed = api.crashed();
    if (crashed && !lastCrash && immersive) flash = 1;
    lastCrash = crashed;
    flash = Math.max(0, flash - dt * 0.5);
    if (floorSpace && !floorPlaced && frame?.getPose) {
      const pose = frame.getPose(floorSpace, renderer.xr.getReferenceSpace());
      if (pose) {
        table.position.y = pose.transform.position.y + C.xr.tableHeightM;
        floorPlaced = true;
      }
    }
    const input = { x: 0, z: 0, alt: 0, yaw: 0 };
    let connected = 0;
    for (const s of session.inputSources) {
      const gp = s.gamepad;
      if (!gp || gp.connected === false) continue;
      connected++;
      const a = gp.axes,
        ax = a.length >= 4 ? 2 : 0,
        dead = (v) => (Math.abs(v || 0) > 0.15 ? v : 0);
      if (s.handedness === "left") {
        input.alt = -dead(a[ax + 1]);
        input.yaw = -dead(a[ax]);
      } else {
        input.x = dead(a[ax]);
        input.z = dead(a[ax + 1]);
      }
      edge(s.handedness + "home", gp.buttons[4]?.pressed, () => {
        if (api.flying()) api.home();
        else if (api.awaitingSD()) api.insert();
        else api.confirm();
      });
      edge(s.handedness + "view", gp.buttons[5]?.pressed, () => {
        if (mode === "immersive-ar") {
          if (hit && frame) {
            const r = frame
              .getHitTestResults(hit)[0]
              ?.getPose(renderer.xr.getReferenceSpace());
            if (r)
              table.position.set(
                r.transform.position.x,
                r.transform.position.y,
                r.transform.position.z,
              );
          }
        } else setImmersive(!immersive);
      });
    }
    if (connected) hadController = true;
    const focused = visible && (!hadController || connected > 0);
    if (focused !== lastFocus) {
      api.focus(focused);
      lastFocus = focused;
      if (!focused)
        api.message("Gafas sin foco o mandos desconectados: vuelo en pausa.");
    }
    if (!connected) {
      api.clear();
      api.input({});
    } else api.input(visible ? { ...input, slow: immersive } : {});
    if (grabbing?.type === "table")
      table.position
        .copy(grabbing.g.getWorldPosition(new T.Vector3()))
        .add(grabbing.offset);
    const both = grips.filter(
      (g, i) =>
        i % 2 === 0 &&
        session.inputSources[i / 2]?.gamepad?.buttons[1]?.pressed,
    );
    if (model && both.length === 2) {
      const distance = both[0]
        .getWorldPosition(new T.Vector3())
        .distanceTo(both[1].getWorldPosition(new T.Vector3()));
      scaleStart ??= { distance, scale: model.scale.x };
      if (scaleStart.distance > 0.01)
        model.scale.setScalar(
          T.MathUtils.clamp(
            (scaleStart.scale * distance) / scaleStart.distance,
            C.xr.minScale,
            C.xr.maxScale,
          ),
        );
    } else scaleStart = null;
    if (mini) mini.position.copy(api.position());
    if (unitCanvas) {
      const ctx = unitCanvas.getContext("2d"),
        tft = document.getElementById("tft");
      ctx.fillStyle = "#10201c";
      ctx.fillRect(0, 0, 320, 240);
      if (tft) ctx.drawImage(tft, 0, 0, 320, 240);
      else {
        ctx.fillStyle = "#baffba";
        ctx.font = "20px sans-serif";
        ctx.fillText(
          api.awaitingSD() ? "INSERTAR SD" : "UNIDAD DE TIERRA",
          12,
          70,
        );
        ctx.fillText("Sin enlace de datos", 12, 110);
      }
      unitTexture.needsUpdate = true;
    }
    if (elapsed - lastHUD > 0.15 && hudCanvas) {
      lastHUD = elapsed;
      const ctx = hudCanvas.getContext("2d");
      ctx.fillStyle = "#102027";
      ctx.fillRect(0, 0, 1200, 240);
      ctx.fillStyle = "#e8f5e8";
      ctx.font = "28px sans-serif";
      api
        .hud()
        .forEach((text, i) => ctx.fillText(text.slice(0, 90), 25, 45 + i * 60));
      hudTexture.needsUpdate = true;
    }
    const rt = renderer.getRenderTarget(),
      enabled = renderer.xr.enabled;
    try {
      renderer.xr.enabled = false;
      renderer.setRenderTarget(target);
      if (elapsed - lastVideo > 1 / C.xr.fpvHz) {
        droneCamera.getWorldPosition(fpvCamera.position);
        droneCamera.getWorldQuaternion(fpvCamera.quaternion);
        renderer.render(flight, fpvCamera);
        lastVideo = elapsed;
      }
    } finally {
      renderer.setRenderTarget(rt);
      renderer.xr.enabled = enabled;
    }
    if (api.flying()) screen.material.map = target.texture;
    else {
      const ctx = panelCanvas.getContext("2d"),
        a = api.review();
      ctx.fillStyle = "#102027";
      ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#e8f5e8";
      ctx.font = "32px sans-serif";
      ctx.fillText(
        api.awaitingSD()
          ? "Inserta SD con agarre o A/X"
          : a
            ? "Agente: " + a.label
            : "Procesando SD en tierra…",
        35,
        65,
      );
      ctx.font = "22px sans-serif";
      const lines = a
        ? [
            ...a.rules.map((r) => r.text),
            "A/X: aceptar sugerencia. Salir de XR: otras decisiones e informe.",
            "Solo apoyo al evaluador certificado.",
          ]
        : ["Sin transmisión ni análisis durante el vuelo."];
      lines
        .slice(0, 7)
        .forEach((line, i) =>
          ctx.fillText(line.slice(0, 85), 35, 130 + i * 45),
        );
      panelTexture.needsUpdate = true;
      screen.material.map = panelTexture;
    }
    if (mode === "immersive-vr" && immersive && api.flying()) {
      // la pose XR nunca se escribe sobre droneCamera
      const desired = droneCamera.getWorldPosition(new T.Vector3());
      carrier.position.lerp(desired, 1 - Math.exp(-dt * 3));
      carrier.quaternion.slerp(
        droneCamera.getWorldQuaternion(new T.Quaternion()),
        1 - Math.exp(-dt * 2),
      );
      const oldParent = view.parent;
      carrier.add(view);
      flight.add(mask);
      mask.material.uniforms.amount.value = Math.min(
        0.85,
        Math.abs(input.yaw) + Math.abs(input.x) * 0.4 + 0.3,
      );

      mask.material.uniforms.black.value = flash;
      try {
        renderer.render(flight, view);
      } finally {
        mask.removeFromParent();
        oldParent.add(view);
      }
    } else {
      view.position.set(0, 0, 0);
      view.quaternion.identity();
      if (flash > 0) {
        mask.material.uniforms.amount.value = 0;
        mask.material.uniforms.black.value = flash;
        root.add(mask);
      }
      try {
        renderer.render(root, view);
      } finally {
        mask.removeFromParent();
      }
    }
    return true;
  }
  function setImmersive(v) {
    if (v && !immersive) {
      flash = 1;
      carrier?.position.copy(droneCamera.getWorldPosition(new T.Vector3()));
    }
    immersive = v && api.allowImmersive?.() !== false;
  }
  return {
    supported,
    enter,
    frame,
    get active() {
      return !!session;
    },
    setImmersive,
    exit() {
      return session?.end();
    },
  };
}
