import { zipStore, sessionFiles } from "./export.js";
import { scoreSession } from "./scoring.js";
import { evaluateAgent, LABELS, DISCLAIMER } from "./agent.js";
import { SimulatedDetector } from "./detector.js";
import {
  measureCrack,
  oraclePixels,
  scaleMmPerPixel,
  focalPixels,
} from "./measurement.js";
import { CONFIG as C, VFOV } from "./config.js";
import { samplePacket, batteryDrain } from "./sensors.js";
import * as T from "./vendor/three.module.js";
import { cases, estimate, suggest } from "./rules.js";
import { photoQuality } from "./quality.js";
import { createWorld } from "./world.js";
const $ = (s) => document.querySelector(s),
  canvas = $("#view");
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
const scene = new T.Scene(),
  hemi = new T.HemisphereLight(0xe0f3ff, 0x746b4a, 2.2),
  sun = new T.DirectionalLight(0xffe8bf, 2.8);
sun.position.set(-12, 24, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -25,
  right: 25,
  top: 28,
  bottom: -28,
  far: 80,
});
sun.shadow.bias = -0.0008;
scene.add(hemi, sun);
const rig = new T.Group();
scene.add(rig);
const camera = new T.PerspectiveCamera(
  VFOV,
  innerWidth / innerHeight,
  0.04,
  180,
);
camera.rotation.order = "YXZ";
camera.position.z = -C.camera.offsetM;
rig.add(camera);
const lamp = new T.SpotLight(0xfff1cf, 0, 12, 0.7, 0.6, 1);
lamp.position.set(0, 0, 0.05);
camera.add(lamp, lamp.target);
lamp.target.position.set(0, 0, -3);
let world,
  environment,
  points = [],
  colliders = [],
  sensorTargets = [],
  sensorBounds = [],
  bounds = [],
  markers = [],
  photos = [],
  level = 0,
  active = false,
  paused = false,
  yaw = 0,
  pitch = 0,
  bank = 0,
  tilt = 0,
  battery = 100,
  last = 0,
  chosen = 0,
  lastShot = -Infinity,
  lastImpact = -Infinity,
  lightOn = false,
  returning = false,
  finishReason = "",
  xrMode = null;
let calibrated = false,
  flightSeconds = 0,
  sortie = 1,
  flightToken = 0,
  capturing = false,
  difficultyKey = "normal";
const truth = new Map(),
  batteryWarnings = new Set();
let groundResults = [],
  processingToken = 0,
  resumeSortie = false,
  agentResult = null,
  decisionRecord = null;
let quakeEnabled = false,
  quakeDone = false,
  quakeLeft = 0,
  tutorialActive = false;
const fallingDebris = [];
let hum = null,
  humGain = null,
  sensorAccumulator = 0;
let stats = {
  seconds: 0,
  batteryUsed: 0,
  flights: 0,
  contacts: 0,
  crashes: 0,
  boundaries: 0,
};
const detector = new SimulatedDetector();
const difficulty = () => C.difficulties[difficultyKey];
const velocity = new T.Vector3(),
  keys = {},
  ray = new T.Raycaster(),
  up = new T.Vector3(0, 1, 0),
  START_STAGE = 4;
function build(l) {
  if (world) {
    scene.remove(world);
    world.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
  environment = createWorld(l, START_STAGE >= 3);
  world = environment.group;
  scene.add(world);
  colliders = environment.colliders;
  sensorTargets = [
    ...new Set([
      ...colliders,
      ...world.children.filter((o) => o.userData.sensorTarget),
    ]),
  ];
  sensorBounds = sensorTargets.map((o) => new T.Box3().setFromObject(o));
  bounds = colliders.map((o) =>
    new T.Box3().setFromObject(o).expandByScalar(C.flight.collisionRadius),
  );
  points = environment.points.map((p) => ({
    ...p,
    state: "pendiente",
    best: null,
  }));
  markers = points.map((p, i) => {
    const mesh = new T.Mesh(
      new T.TorusGeometry(C.quality.markerRadiusM, 0.003, 6, 36),
      new T.MeshBasicMaterial({ color: 0xc4f37a }),
    );
    mesh.position.copy(p.position).addScaledVector(p.normal, 0.018);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.normal);
    world.add(mesh);
    return mesh;
  });
  scene.background = new T.Color(environment.sky);
  scene.fog = new T.Fog(environment.sky, 40, 120);
  hemi.intensity = 2.2 * environment.light;
  sun.intensity = 2.8 * environment.light;
  renderer.shadowMap.needsUpdate = true;
}
function menu() {
  processingToken++;
  if (humGain) humGain.gain.value = 0;
  $("#status").textContent = "INSPECCIÓN POSTSISMO · 2G · AGENTE CORREGIDO";
  active = false;
  paused = false;
  document.exitPointerLock?.();
  $("#hud").hidden = true;
  $("#panel").hidden = false;
  $("#panel").className = "";
  $("#panel").innerHTML =
    `<div class="eyebrow">INGENIERÍA ELECTRÓNICA / COLOMBIA</div><h1>Después del sismo.<br><em>Antes del veredicto.</em></h1><p class="intro">Pilota un dron de inspección, documenta daños y recupera la SD para analizarlos en tierra. Apoyo al triage, nunca sustituto del evaluador certificado.</p><div class="controls-sheet"><label>Dificultad <select id="difficulty">${Object.entries(
      C.difficulties,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${k === difficultyKey ? "selected" : ""}>${v.label}</option>`,
      )
      .join(
        "",
      )}</select></label><label><input type="checkbox" id="replica" ${quakeEnabled ? "checked" : ""}> Réplica sísmica opcional</label></div><p>Primera visita: en la vivienda hay tutorial guiado de ${C.tutorial.seconds} s.</p><section id="missions">${["Vivienda / sector residencial", "Apartamentos / sector urbano", "Edificio / corredor vial"].map((n, i) => `<button data-level="${i}"><small>MISIÓN 0${i + 1}</small><h2>${n}</h2><p>Reconoce el sitio, reúne evidencias y decide.</p><strong>Preparar misión →</strong></button>`).join("")}</section><p class="note">Análisis sintético educativo, no una IA real. Sin CDN ni transmisión. Ratón y teclado necesarios para pilotar.</p>`;
  $("#panel").onclick = (e) => {
    const b = e.target.closest("[data-level]");
    if (b) {
      difficultyKey = $("#difficulty").value;
      quakeEnabled = $("#replica").checked;
      briefing(+b.dataset.level);
    }
  };
}
function briefing(l) {
  resumeSortie = false;
  photos = [];
  truth.clear();
  level = l;
  build(l);
  rig.position.set(17, 12, 23);
  camera.lookAt(0, environment.height * 0.4, -8);
  const descriptions = [
    "Vivienda de dos pisos: ladrillo, friso y antejardín. Distingue fisuras de humedad y sombras de cables.",
    "Bloque de cuatro pisos: inspecciona paños de relleno, encuentros de concreto y el elemento localizado.",
    "Edificio de cinco pisos: reconoce apoyos, losas y obstáculos. Evita los cables y elementos sin soporte.",
  ];
  $("#panel").innerHTML =
    `<div class="eyebrow">MISIÓN 0${l + 1} / BRIEFING</div><h1>Primero observa.<br><em>Luego documenta.</em></h1><p class="intro">${descriptions[l]}</p><ol class="briefing-list"><li>Despega de H. Completa <b>4 puntos exteriores y 3 interiores</b>.</li><li>Captura a <b>0,05–1,2 m (segmento de grieta)</b>, de frente, estable y con el rasgo completo. Se acepta con calidad ≥ 60%.</li><li>Entra por el letrero <b>ACCESO → INTERIOR</b>. Para subir al piso 2, busca el <b>hueco al frente-derecha</b> (visto desde la calle). No intentes atravesar losas.</li><li>Adentro activa <b>T: luz del módulo</b>. Evita obstáculos: un choque a más de 1,7 m/s termina el vuelo; un roce invalida la estabilidad durante 1,5 s.</li><li>Usa <b>G</b> para revisar fotos, <b>B</b> para orientar el regreso y <b>L</b> para aterrizar en H. B no es piloto automático.</li></ol><div class="controls-sheet"><span>W / S · avanzar / retroceder</span><span>A / D · lateral</span><span>Q / E · bajar / subir</span><span>Ratón o ← → · girar</span><span>↑ ↓ · orientar inclinación</span><span>F · foto / G · galería</span><span>T · luz / P · pausa</span><span>B · guía a base / L · aterrizar</span></div><p class="note">Cámara fija al cuerpo, velocidad máxima 2,4 m/s. Se estabiliza al soltar los controles. El video y HUD son una interfaz de juego; el módulo no transmite ni analiza datos durante el vuelo. Luz y rango láser son simplificaciones, no especificaciones del hardware real.</p><button id="launch">Entendido · iniciar vuelo →</button> <button id="backMenu">Volver</button>`;
  $("#panel").onclick = (e) => {
    if (e.target.closest("#launch")) preflight(l);
    if (e.target.closest("#backMenu")) menu();
  };
}
function start(l) {
  clearKeys();
  $("#pauseBtn").textContent = "Pausa [P]";
  level = l;
  build(l);
  rig.position.copy(environment.base).y = 1.2;
  rig.rotation.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  yaw = pitch = bank = tilt = 0;
  velocity.set(0, 0, 0);
  if (!resumeSortie) {
    photos = [];
    truth.clear();
    sortie = 1;
    stats = {
      seconds: 0,
      batteryUsed: 0,
      flights: 0,
      contacts: 0,
      crashes: 0,
      boundaries: 0,
    };
    decisionRecord = null;
    quakeDone = false;
  } else {
    sortie++;
    for (const p of photos.filter((p) => p.quality.accepted && !p.preReplica)) {
      if (points[p.point]) {
        points[p.point].best = p;
        points[p.point].state = "aceptada";
      }
    }
  }
  resumeSortie = false;
  flightSeconds = 0;
  flightToken++;
  sensorCache = null;
  chosen = 0;
  lastShot = -Infinity;
  lastImpact = -Infinity;
  lightOn = false;
  lamp.intensity = 0;
  battery = 100;
  batteryWarnings.clear();
  returning = false;
  paused = false;
  active = true;
  finishReason = "";
  $("#panel").hidden = true;
  $("#hud").hidden = false;
  $("#thumbnail").hidden = true;
  toast(
    "Despega: W hacia el edificio, E sube. Entra por ACCESO; para subir al piso 2 usa el hueco al frente-derecha. Selecciona un punto y dispara con F a 0,05–1,2 m (segmento de grieta).",
  );
  try {
    tutorialActive = l === 0 && !localStorage.getItem("dse-tutorial-2");
  } catch {
    tutorialActive = l === 0;
  }
  initHum();
  updateHUD();
}
function toast(t) {
  $("#message").textContent = t;
}
function clearKeys() {
  for (const k in keys) keys[k] = false;
}
$("#menuBtn").onclick = () => {
  if (
    active &&
    !confirm("¿Abandonar la misión? Se perderán las fotos de esta sesión.")
  )
    return;
  renderer.xr.getSession()?.end();
  menu();
};
canvas.onclick = () => {
  if (active && !paused) canvas.requestPointerLock?.();
};
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas && active && !paused && !xrMode) {
    yaw -= e.movementX * 0.002;
    pitch = T.MathUtils.clamp(pitch - e.movementY * 0.0015, -0.6, 0.6);
  }
});
function pause() {
  if (!active || $("#gallery").open) return;
  paused = !paused;
  clearKeys();
  velocity.set(0, 0, 0);
  document.exitPointerLock?.();
  $("#pauseBtn").textContent = paused ? "Continuar [P]" : "Pausa [P]";
  toast(
    paused
      ? "Pausa: vuelo y batería detenidos. Pulsa P para continuar."
      : "Vuelo reanudado.",
  );
}
onkeydown = (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (
    ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (!keys[e.code]) {
    if (e.code === "KeyG") gallery();
    if (e.code === "KeyP") pause();
    if (active && !paused) {
      if (e.code === "KeyF") capture();
      if (e.code === "KeyL") land();
      if (e.code === "KeyB") returnToBase();
      if (e.code === "KeyT") {
        lightOn = !lightOn;
        lamp.intensity = lightOn ? 12 : 0;
        toast(
          lightOn
            ? "Luz del módulo encendida (ayuda de simulación)."
            : "Luz apagada.",
        );
      }
    }
  }
  keys[e.code] = true;
};
onkeyup = (e) => (keys[e.code] = false);
onblur = () => {
  clearKeys();
  if (active && !paused && !xrMode) pause();
};
function cam() {
  return renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
}
let sensorCache = null,
  lastSensorMs = -Infinity;
function coneHits() {
  scene.updateMatrixWorld(true);
  const c = cam(),
    origin = c.getWorldPosition(new T.Vector3()),
    q = c.getWorldQuaternion(new T.Quaternion()),
    dirs = [new T.Vector3(0, 0, -1)];
  origin.add(new T.Vector3(...C.laser.offsetFromCameraM).applyQuaternion(q));
  for (let r = 1; r <= C.laser.coneRings; r++)
    for (let j = 0; j < C.laser.raysPerRing; j++) {
      const a = (j * Math.PI * 2) / C.laser.raysPerRing,
        t =
          (Math.tan((C.laser.coneDeg * Math.PI) / 360) * r) / C.laser.coneRings;
      dirs.push(
        new T.Vector3(Math.cos(a) * t, Math.sin(a) * t, -1).normalize(),
      );
    }
  const near = sensorTargets.filter(
    (o, i) => sensorBounds[i].distanceToPoint(origin) <= C.laser.maxMm / 1000,
  );
  return dirs.flatMap((d) => {
    ray.set(origin, d.applyQuaternion(q));
    const h = ray.intersectObjects(near, false)[0];
    if (!h) return [];
    const m = h.object.material;
    return [
      {
        distanceMm: h.distance * 1000,
        glass: !!h.object.userData.glass,
        reflectance:
          h.object.userData.reflectance ??
          (m.map
            ? C.laser.mappedReflectance
            : m.color
              ? 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b
              : 0.5),
      },
    ];
  });
}
function readSensors(timeMs = Date.now()) {
  return samplePacket({
    timeMs,
    elapsedSeconds: flightSeconds,
    calibrated,
    pitchDeg: T.MathUtils.radToDeg(pitch + tilt),
    rollDeg: T.MathUtils.radToDeg(bank),
    yawDeg: T.MathUtils.radToDeg(yaw),
    battery,
    hits: coneHits(),
    sun: !environment.indoor(rig.position) && environment.light >= 1,
  });
}
function laser() {
  const now = performance.now();
  if (!sensorCache || now - lastSensorMs >= 1000 / C.laser.hz) {
    sensorCache = readSensors();
    lastSensorMs = now;
  }
  return sensorCache.laser.valid ? sensorCache.laser.mm / 1000 : Infinity;
}
function point() {
  return points[chosen];
}
function illumination(p) {
  return Math.min(
    1,
    (p.inside ? 0.18 : environment.light * 0.85) + (lightOn ? 0.65 : 0),
  );
}
function quality(exposureLaser = null) {
  const p = point();
  if (!p)
    return {
      score: 0,
      accepted: false,
      reasons: ["No hay un punto seleccionado."],
    };
  scene.updateMatrixWorld(true);
  const c = cam(),
    pos = c.getWorldPosition(new T.Vector3()),
    direction = c.getWorldDirection(new T.Vector3()),
    delta = pos.clone().sub(p.position),
    distance = delta.length(),
    angle = T.MathUtils.radToDeg(
      Math.acos(
        Math.min(
          T.MathUtils.clamp(delta.normalize().dot(p.normal), -1, 1),
          T.MathUtils.clamp(-direction.dot(p.normal), -1, 1),
        ),
      ),
    );
  const checkCamera = new T.PerspectiveCamera(VFOV, 16 / 9, 0.04, 180);
  checkCamera.position.copy(pos);
  c.getWorldQuaternion(checkCamera.quaternion);
  checkCamera.updateMatrixWorld(true);
  const corners = [
    [-C.quality.roiHalfWidthM, -C.quality.roiHalfHeightM],
    [C.quality.roiHalfWidthM, -C.quality.roiHalfHeightM],
    [-C.quality.roiHalfWidthM, C.quality.roiHalfHeightM],
    [C.quality.roiHalfWidthM, C.quality.roiHalfHeightM],
  ];
  let framed = direction.dot(p.position.clone().sub(pos).normalize()) > 0.9;
  for (const [x, y] of corners) {
    const right = new T.Vector3().crossVectors(up, p.normal).normalize();
    const v = p.position
      .clone()
      .addScaledVector(right, x)
      .addScaledVector(up, y)
      .project(checkCamera);
    if (v.z < -1 || v.z > 1 || Math.abs(v.x) > 0.91 || Math.abs(v.y) > 0.91)
      framed = false;
  }
  ray.set(pos, p.position.clone().sub(pos).normalize());
  const obstruction = ray.intersectObjects(colliders, false)[0];
  const visible = !obstruction || obstruction.distance >= distance - 0.12;
  const d = exposureLaser
    ? exposureLaser.valid
      ? exposureLaser.mm / 1000
      : Infinity
    : laser();
  return {
    ...photoQuality({
      distance,
      angle,
      speed: velocity.length(),
      light: illumination(p),
      framed,
      visible,
      laserValid:
        Number.isFinite(d) &&
        d >= C.laser.minMm / 1000 &&
        d <= C.laser.maxMm / 1000,
      impact: performance.now() - lastImpact < 1500,
    }),
    distance,
    laser: d,
    angle,
    light: illumination(p),
  };
}
function orient(dt) {
  yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * dt;
  pitch = T.MathUtils.clamp(
    pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * dt * 0.6,
    -0.6,
    0.6,
  );
  const local = velocity.clone().applyAxisAngle(up, -yaw);
  tilt = T.MathUtils.lerp(tilt, -local.z * 0.045, 1 - Math.exp(-dt * 4));
  bank = T.MathUtils.lerp(bank, -local.x * 0.045, 1 - Math.exp(-dt * 4));
  rig.rotation.set(0, yaw, 0);
  camera.rotation.set(pitch + tilt, 0, bank);
}
function move(dt) {
  tickSensors(dt);
  if (battery <= 0) {
    velocity.set(0, 0, 0);
    ray.set(rig.position, new T.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(colliders, false)[0];
    if (
      hit &&
      hit.distance <= C.flight.collisionRadius + C.battery.descentMps * dt
    ) {
      finish("Batería agotada: descenso automático. SD recuperada.");
      return;
    }
    rig.position.y -= C.battery.descentMps * dt;
    return;
  }
  orient(dt);
  const v = new T.Vector3(
    (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
    (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0),
    (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0),
  );
  if (v.length() > 1) v.normalize();
  v.applyAxisAngle(up, yaw).multiplyScalar(
    C.flight.maxSpeed *
      (keys.ShiftLeft || keys.ShiftRight ? C.flight.precisionFactor : 1),
  );
  v.x += Math.sin(flightSeconds) * difficulty().windMps;
  v.z += Math.cos(flightSeconds * 0.7) * difficulty().windMps;
  v.clampLength(0, C.flight.maxSpeed);
  velocity.lerp(v, 1 - Math.exp(-dt * C.flight.stabilizeRate));
  const movement = velocity.clone().multiplyScalar(dt),
    steps = Math.max(1, Math.ceil(movement.length() / 0.06));
  for (let j = 0; j < steps; j++) {
    const old = rig.position.clone();
    rig.position.addScaledVector(movement, 1 / steps);
    rig.position.y = T.MathUtils.clamp(
      rig.position.y,
      0.24,
      environment.height + 6,
    );
    if (
      rig.position.x < C.flight.zone.minX ||
      rig.position.x > C.flight.zone.maxX ||
      rig.position.z < C.flight.zone.minZ ||
      rig.position.z > C.flight.zone.maxZ
    )
      stats.boundaries++;
    rig.position.x = T.MathUtils.clamp(
      rig.position.x,
      C.flight.zone.minX,
      C.flight.zone.maxX,
    );
    rig.position.z = T.MathUtils.clamp(
      rig.position.z,
      C.flight.zone.minZ,
      C.flight.zone.maxZ,
    );
    if (bounds.some((b) => b.containsPoint(rig.position))) {
      rig.position.copy(old);
      const speed = velocity.length();
      if (performance.now() - lastImpact > C.flight.impactMs) stats.contacts++;
      lastImpact = performance.now();
      velocity.multiplyScalar(-0.18);
      toast("Roce: aléjate del obstáculo y espera a estabilizar.");
      if (START_STAGE >= 3 && speed > C.flight.crashSpeed) {
        stats.crashes++;
        finish("Choque fuerte: vuelo interrumpido. Se conservaron las fotos.");
        return;
      }
      break;
    }
  }
  flightSeconds += dt;
  battery = Math.max(
    0,
    battery -
      batteryDrain(dt, velocity.length(), lightOn, difficulty().batteryFactor),
  );
  for (const threshold of C.battery.warnings)
    if (battery <= threshold && !batteryWarnings.has(threshold)) {
      batteryWarnings.add(threshold);
      toast(`Batería ${threshold}%: regresa a base.`);
      alertTone();
    }
}
function bearing(p) {
  const d = p.clone().sub(rig.position);
  const estimatedYaw = sensorCache
    ? (sensorCache.imu.yawDeg * Math.PI) / 180
    : yaw;
  const a =
    T.MathUtils.euclideanModulo(
      Math.atan2(-d.x, -d.z) - estimatedYaw + Math.PI,
      Math.PI * 2,
    ) - Math.PI;
  return Math.abs(a) < 0.12
    ? "↑ al frente"
    : a > 0
      ? "← izquierda"
      : "derecha →";
}
function accepted() {
  return points.filter((p) => p.best).length;
}
function updateHUD() {
  const inside = environment.indoor(rig.position);
  renderer.toneMappingExposure = inside ? (lightOn ? 0.9 : 0.23) : 1;
  const d = laser(),
    valid =
      Number.isFinite(d) &&
      d >= C.laser.minMm / 1000 &&
      d <= C.laser.maxMm / 1000;
  $("#metrics").innerHTML =
    `<span class="${valid ? "" : "bad"}">LÁSER ${valid ? (d * 1000).toFixed(0) + " mm" : "SIN LECTURA"}</span>${valid ? `<br>2 px ≈ ${(C.measurement.minPixels * scaleMmPerPixel(d * 1000)).toFixed(2)} mm` : `<br>${sensorCache?.laser.reason || "Apunta a un muro"}`}<br>BATERÍA ${battery.toFixed(0)} %<br>MPU · YAW ${sensorCache?.imu.yawDeg.toFixed(1) ?? "—"}°${calibrated ? " CAL" : " SIN CAL"}<br>ALTURA ${rig.position.y.toFixed(1)} m<br>VELOCIDAD ${velocity.length().toFixed(2)} m/s<br>${inside ? "INTERIOR · " + (lightOn ? "LUZ ON" : "LUZ OFF [T]") : "EXTERIOR"}<br>SD ${photos.length} fotos · ${accepted()}/${points.length} puntos`;
  const p = point(),
    q = quality();
  $("#target").innerHTML =
    `<small>${returning ? "REGRESO A BASE" : "INSPECCIÓN · " + (p?.inside ? "INTERIOR" : "EXTERIOR")}</small><h3>${returning ? "Base / carpa de evaluación" : p?.name}</h3><p>${bearing(returning ? environment.base : p.position)} · ${(returning ? rig.position : cam().getWorldPosition(new T.Vector3())).distanceTo(returning ? environment.base : p.position).toFixed(2)} m ${returning ? "" : "(desde cámara)"}<br>${returning ? "Zona H · altura < 0,75 m · velocidad < 0,3 m/s" : `Altura objetivo ${p.position.y.toFixed(1)} m · calidad ${q.score}%<br>${q.reasons[0] || "✓ Encuadre listo [F]. La medición se verifica en tierra."}`}${!returning ? `<br>Láser útil: ${C.laser.minMm}–${C.laser.maxMm} mm. Para capilares, aproxima la cámara a ${C.laser.minMm + C.guidance.rangeMarginMm}–${C.guidance.fineTargetMaxMm} mm con Shift. Una foto aceptada no garantiza que la grieta sea medible.` : ""}</p><div class="checkpoint-list">${points.map((p, i) => `<button data-point="${i}" class="${i === chosen ? "selected" : ""}">${i + 1}. ${p.state}${p.best ? " " + p.best.quality.score + "%" : ""}</button>`).join("")}</div>`;
  markers.forEach((m, i) => {
    m.visible = !returning && !points[i].best;
    m.material.color.set(i === chosen ? 0xc4f37a : 0x98aaa4);
  });
  drawMap();
}
$("#target").onclick = (e) => {
  const b = e.target.closest("[data-point]");
  if (b) {
    chosen = +b.dataset.point;
    returning = false;
  }
};
function drawMap() {
  const c = $("#map"),
    ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 200, 180);
  ctx.fillStyle = "#10232aee";
  ctx.fillRect(0, 0, 200, 180);
  const xy = (v) => [100 + v.x * 3.5, 125 + v.z * 3.5];
  ctx.strokeStyle = "#607975";
  const dim = environment.dimensions;
  if (dim) {
    const [left, top] = xy(new T.Vector3(-dim.W / 2, 0, dim.bz));
    ctx.strokeRect(left, top, dim.W * 3.5, (dim.fz - dim.bz) * 3.5);
  }
  for (const [i, p] of points.entries()) {
    const [x, y] = xy(p.position);
    ctx.fillStyle = p.best ? "#8bd5b2" : i === chosen ? "#c4f37a" : "#a9b6b0";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 7);
    ctx.fill();
  }
  const [bx, by] = xy(environment.base);
  ctx.fillStyle = "#c4f37a";
  ctx.fillText("H BASE", bx - 18, by + 12);
  const [x, y] = xy(rig.position);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-yaw);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(-4, 5);
  ctx.lineTo(4, 5);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#b9cecb";
  ctx.fillText("N ↑ · plano de navegación", 12, 17);
}
let audio;
function shutter() {
  try {
    audio ??= new AudioContext();
    audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(C.audio.shutterStartHz, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      C.audio.shutterEndHz,
      audio.currentTime + C.audio.shutterSeconds * 0.8,
    );
    g.gain.setValueAtTime(C.audio.shutterGain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + C.audio.shutterSeconds);
  } catch {}
  $("#flash").classList.remove("shoot");
  void $("#flash").offsetWidth;
  $("#flash").classList.add("shoot");
}
function snapshot() {
  renderer.toneMappingExposure = environment.indoor(rig.position)
    ? lightOn
      ? C.camera.exposureLit
      : C.camera.exposureIndoor
    : C.camera.exposureOutdoor;
  const target = new T.WebGLRenderTarget(C.camera.width, C.camera.height),
    photoCam = new T.PerspectiveCamera(VFOV, 16 / 9, 0.04, 180),
    pixels = new Uint8Array(C.camera.width * C.camera.height * 4);
  scene.updateMatrixWorld(true);
  cam().getWorldPosition(photoCam.position);
  cam().getWorldQuaternion(photoCam.quaternion);
  const before = renderer.getRenderTarget(),
    xr = renderer.xr.enabled;
  const saved = markers.map((m) => m.visible);
  markers.forEach((m) => (m.visible = false));
  try {
    renderer.xr.enabled = false;
    renderer.setRenderTarget(target);
    renderer.render(scene, photoCam);
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      C.camera.width,
      C.camera.height,
      pixels,
    );
  } finally {
    renderer.setRenderTarget(before);
    renderer.xr.enabled = xr;
    markers.forEach((m, i) => (m.visible = saved[i]));
    target.dispose();
  }
  const out = document.createElement("canvas");
  out.width = C.camera.width;
  out.height = C.camera.height;
  const ctx = out.getContext("2d"),
    img = ctx.createImageData(C.camera.width, C.camera.height);
  for (let y = 0; y < C.camera.height; y++)
    img.data.set(
      pixels.subarray(
        (C.camera.height - 1 - y) * C.camera.width * 4,
        (C.camera.height - y) * C.camera.width * 4,
      ),
      y * C.camera.width * 4,
    );
  ctx.putImageData(img, 0, 0);
  return degradePhoto(out);
}
async function capture() {
  if (!active || paused || xrMode) return;
  if (photos.filter((p) => p.sortie === sortie).length >= C.sd.capacity) {
    toast("SD llena: regresa a base.");
    return;
  }
  if (capturing || performance.now() - lastShot < 1000) {
    toast("Espera al obturador y al intervalo entre fotos.");
    return;
  }
  capturing = true;
  const token = flightToken;
  toast("Obturador…");
  await new Promise((r) => setTimeout(r, C.camera.shutterMs));
  if (!active || paused || token !== flightToken) {
    capturing = false;
    return;
  }
  // Todas las lecturas y la pose se congelan EN EL INSTANTE DE EXPOSICIÓN, no al pulsar F.
  const p = point(),
    timeMs = Date.now(),
    packet = readSensors(timeMs),
    q = quality(packet.laser),
    id = photos.length + 1;
  // HUD y foto quedan sincronizados con la única lectura utilizada al exponer.
  sensorCache = packet;
  lastSensorMs = performance.now();
  if (!packet.laser.valid) {
    q.accepted = false;
    q.score = Math.min(q.score, C.quality.accepted - 1);
    q.reasons = q.reasons.filter((r) => !r.includes("Láser"));
    q.reasons.unshift(
      "Láser sin lectura al exponer: " +
        packet.laser.reason +
        ". Repite sobre una superficie opaca dentro del rango.",
    );
  }
  packet.imu.wallAngleDeg = T.MathUtils.clamp(
    q.angle +
      (packet.imu.yawDeg - T.MathUtils.radToDeg(yaw)) +
      (packet.imu.pitchDeg - T.MathUtils.radToDeg(pitch + tilt)),
    0,
    C.imu.maxWallAngleDeg,
  );
  packet.imu.wallAngleSource =
    "IMU + normal al muro SIMULADA; no función nativa del MPU6050";
  const image = snapshot();
  const record = {
    id,
    timeMs,
    image,
    sensors: packet,
    quality: { score: q.score, accepted: q.accepted, reasons: q.reasons },
    distance: packet.laser.valid ? packet.laser.mm / 1000 : Infinity,
    tilt: packet.imu.pitchDeg,
    name: p.name,
    point: chosen,
    inside: p.inside,
    time: new Date(timeMs).toLocaleTimeString("es-CO"),
    sortie,
  };
  truth.set(id, {
    timeMs,
    point: chosen,
    distanceMm: q.distance * 1000,
    angleDeg: q.angle,
    widthMm: p.width,
    box: captureRegion(p),
    pitchDeg: T.MathUtils.radToDeg(pitch + tilt),
    rollDeg: T.MathUtils.radToDeg(bank),
    position: rig.position.toArray(),
  });
  photos.push(record);
  lastShot = performance.now();
  capturing = false;
  shutter();
  $("#thumbnail").src = image;
  $("#thumbnail").hidden = true;
  if (q.accepted) {
    p.state = "aceptada";
    p.best = record;
    const next = points.findIndex((p) => !p.best);
    if (next >= 0) chosen = next;
    else returning = true;
  } else p.state = p.best ? "aceptada" : "rechazada";
  toast(
    q.accepted
      ? `Foto ${id} guardada en SD · calidad local ${q.score}%.`
      : `Foto ${id} guardada (${q.score}%): ${q.reasons.join(" ")}`,
  );
  updateHUD();
}
function photoCard(p, i, analysis = false) {
  const gt = truth.get(p.id);
  const e =
    analysis && gt
      ? measureCrack({
          pixels: oraclePixels(gt),
          laser: p.sensors.laser,
          angleDeg: p.sensors.imu.wallAngleDeg,
        })
      : { measurable: false };
  return `<article><img src="${p.image}" alt="Foto real ${i + 1}: ${p.name}" loading="lazy"><h3>${i + 1}. ${p.name}</h3><p class="${p.quality.accepted ? "good" : "bad"}">${p.quality.accepted ? "ACEPTADA" : "RECHAZADA"} · calidad ${p.quality.score}%</p><p>${p.time} · láser ${Number.isFinite(p.distance) ? p.distance.toFixed(2) + " m" : "sin lectura"} · cabeceo ${p.sensors.imu.pitchDeg.toFixed(1)}° · batería ${p.sensors.battery.percent.toFixed(0)}%<br>${p.quality.reasons.join("<br>") || "Encuadre, distancia y estabilidad correctos."}</p>${analysis && p.quality.accepted ? `<p>${e.measurable ? `Ancho simulado: ${e.widthMm.toFixed(2)} ± ${e.uncertaintyMm.toFixed(2)} mm` : e.reason || "No medible"}</p>` : ""}</article>`;
}
let galleryWasPaused = false;
function gallery() {
  if (active) {
    toast(
      "SD no consultable durante el vuelo: sin enlace de datos. Revisa las imágenes en tierra.",
    );
    return;
  }
  if ($("#gallery").open) {
    $("#gallery").close();
    paused = galleryWasPaused;
    return;
  }
  if (!active) return;
  galleryWasPaused = paused;
  paused = true;
  clearKeys();
  velocity.set(0, 0, 0);
  document.exitPointerLock?.();
  $("#galleryPhotos").innerHTML = photos.length
    ? photos.map((p, i) => photoCard(p, i)).join("")
    : "<p>Aún no hay fotos. Apunta a un checkpoint y pulsa F.</p>";
  $("#gallery").showModal();
}
$("#gallery").addEventListener("cancel", () => {
  paused = galleryWasPaused;
});
$("#closeGallery").onclick = gallery;
$("#galleryBtn").onclick = gallery;
$("#thumbnail").onclick = gallery;
function returnToBase() {
  returning = true;
  toast(
    "Guía hacia H activada. Es navegación manual: vuela hasta la carpa y aterriza con L.",
  );
}
function land() {
  if (!active || paused) return;

  if (
    Math.hypot(
      rig.position.x - environment.base.x,
      rig.position.z - environment.base.z,
    ) > C.flight.landRadius ||
    rig.position.y > C.flight.landHeight ||
    velocity.length() > C.flight.landSpeed
  ) {
    toast(
      "Aterrizaje: sitúate en H, baja de 0,75 m y espera velocidad < 0,3 m/s.",
    );
    return;
  }
  finish("Aterrizaje completado. SD recuperada en la unidad de tierra.");
}
function finish(reason) {
  stats.seconds += flightSeconds;
  stats.batteryUsed += 100 - battery;
  stats.flights++;
  active = false;
  paused = false;
  clearKeys();
  velocity.set(0, 0, 0);
  flightToken++;
  capturing = false;
  finishReason = reason;
  renderer.xr.getSession()?.end();
  document.exitPointerLock?.();
  $("#hud").hidden = true;
  analyze();
}
async function analyze() {
  const token = ++processingToken;
  groundResults = [];
  $("#panel").hidden = false;
  $("#panel").className = "analysis";
  window.scrollTo(0, 0);
  $("#panel").innerHTML =
    `<div class="eyebrow">RASPBERRY PI ZERO 2 W / SD EN TIERRA</div><h1>Unidad de tierra</h1><p>${finishReason}</p><p>Simulación del modelo de IA liviano del proyecto. No es inferencia de IA real ni un benchmark de la Raspberry Pi.</p><canvas id="tft" width="${C.ground.width}" height="${C.ground.height}"></canvas><p id="queueState">Cargando SD…</p><div id="coverage"></div><div id="processed" class="photo-grid"></div><div id="groundSummary"></div>`;
  for (let i = 0; i < photos.length; i++) {
    if (token !== processingToken) return;
    drawTFT(i, photos.length, photos[i]);
    $("#queueState").textContent = `Procesando foto ${i + 1}/${photos.length}…`;
    await new Promise((r) =>
      setTimeout(
        r,
        C.ground.minProcessMs +
          Math.random() * (C.ground.maxProcessMs - C.ground.minProcessMs),
      ),
    );
    if (token !== processingToken) return;
    const result = await detector.detect(
      photos[i],
      truth.get(photos[i].id),
      C.scenarios[level],
    );
    groundResults.push(result);
    const element = document.createElement("div");
    element.innerHTML = detectedCard(photos[i], result, i);
    $("#processed").append(element);
    drawCoverage();
  }
  if (token !== processingToken) return;
  $("#queueState").textContent =
    "Cola terminada. SD leída sin transmitir durante el vuelo.";
  drawTFT(photos.length, photos.length);
  renderGroundSummary();
}
function detectedCard(p, r, i) {
  const boxes = r.detections
    .map(
      (d) =>
        `<div class="detection" style="left:${d.box.x * 100}%;top:${d.box.y * 100}%;width:${d.box.w * 100}%;height:${d.box.h * 100}%"><span>${d.measure.measurable ? d.measure.widthMm.toFixed(2) + " ± " + d.measure.uncertaintyMm.toFixed(2) + " mm" : "No medible"}</span></div>`,
    )
    .join("");
  return `<article><div class="detected-photo"><img src="${p.image}" alt="Captura ${p.id}: ${p.name}">${boxes}</div><h3>${p.id}. ${p.name}</h3><p>Calidad ${p.quality.score}% · ${p.quality.accepted ? "aceptada" : "rechazada"}</p><p>${r.miss ? r.issues?.join("<br>") || "No se resolvió la grieta: revisar resolución y calidad." : r.detections.map((d) => d.kind + ": " + (d.measure.reason || d.measure.widthMm.toFixed(2) + " ± " + d.measure.uncertaintyMm.toFixed(2) + " mm")).join("<br>")}</p><p>${p.quality.reasons.join("<br>")}</p></article>`;
}
function drawTFT(done, total, p) {
  const c = $("#tft");
  if (!c) return;
  const x = c.getContext("2d");
  x.fillStyle = "#101c17";
  x.fillRect(0, 0, c.width, c.height);
  x.font = "13px monospace";
  x.fillStyle = "#9ee2a0";
  x.fillText("PI ZERO 2 W / TFT 320x240", 10, 22);
  x.fillText("SD local · sin enlace de vuelo", 10, 45);
  x.fillText(`Cola ${done}/${total}`, 10, 72);
  x.strokeStyle = "#9ee2a0";
  x.strokeRect(10, 90, 300, 16);
  x.fillRect(10, 90, total ? (300 * done) / total : 300, 16);
  x.fillText(
    p ? "Foto " + p.id + ": procesando" : "Procesamiento terminado",
    10,
    135,
  );
  x.fillText("IA LIVIANA: SIMULACIÓN", 10, 170);
  x.fillText("Revisar cobertura y reglas", 10, 204);
}
function drawCoverage() {
  const seen = new Set(
    groundResults
      .filter((r) => r.quality >= C.quality.accepted)
      .map((r) => r.point),
  );
  $("#coverage").innerHTML =
    "<h3>Cobertura de checkpoints</h3>" +
    points
      .map(
        (p, i) =>
          `<span class="coverage ${seen.has(i) ? "good" : "bad"}">${i + 1}: ${seen.has(i) ? "foto de calidad" : "pendiente / insuficiente"}</span>`,
      )
      .join("");
}
function renderGroundSummary() {
  agentResult = evaluateAgent({
    required: points.map((p, i) => i),
    results: groundResults,
  });
  const a = agentResult;
  $("#groundSummary").innerHTML =
    `<h2>Sugerencia: ${a.label}</h2><p>${DISCLAIMER}</p><p>${a.referral}</p>${quakeDone ? "<p>Réplica modelada: se exige repetir la Fase 1. Las fotos previas no cubren checkpoints.</p>" : ""}<p>Cobertura fotográfica ${(a.coverage * 100).toFixed(0)}% · anchos medidos en ${a.measuredPoints}/${points.length} puntos. Las limitaciones ópticas no anulan evidencias estructurales.</p><p>Confianza de cobertura/calidad ${(a.confidence * 100).toFixed(0)}% (no probabilidad de seguridad).</p><ul>${a.rules.map((r) => `<li>${LABELS[r.level]} · ${r.text}</li>`).join("")}</ul>${a.measurementWarnings.length ? "<h3>Limitaciones de medición (no son checkpoints ausentes)</h3><ul>" + a.measurementWarnings.map((t) => "<li>" + t + "</li>").join("") + "</ul>" : ""}${a.missing.length ? "<h3>Qué falta</h3><ul>" + a.missing.map((t) => "<li>" + t + "</li>").join("") + '</ul><button id="secondSortie">Segunda salida · batería nueva y conservar fotos</button>' : ""}${!a.missing.length && a.measurementWarnings.length ? '<button id="secondSortie">Mejorar medidas · segunda salida opcional</button>' : ""}<h3>No evaluable con este sistema</h3><ul>${a.notEvaluable.map((t) => "<li>" + t + "</li>").join("")}</ul>${a.verdict === null ? '<button id="partialReport">Ver informe parcial (INDETERMINADO)</button>' : ""}<div class="choices">${LABELS.map((v, i) => `<button data-verdict="${i}" ${a.verdict === null ? "disabled" : ""}>${v}</button>`).join("")}</div><label>Si discrepas del agente, elige una razón: <select id="disagreeReason"><option value="">Seleccionar…</option>${C.disagreementReasons.map((r, i) => `<option value="${i}">${r}</option>`).join("")}</select></label><div id="result"></div><button id="again">Volver a misiones</button>`;
  $("#again").onclick = menu;
  $("#partialReport")?.addEventListener("click", () => {
    decisionRecord = {
      decision: null,
      reason: "INDETERMINADO: no hay evidencia suficiente",
    };
    showReport();
  });
  $("#secondSortie")?.addEventListener("click", () => {
    resumeSortie = true;
    preflight(level);
  });
  $("#groundSummary").onclick = (e) => {
    const b = e.target.closest("[data-verdict]");
    if (b && a.verdict !== null) {
      const decision = +b.dataset.verdict,
        reason = $("#disagreeReason").value;
      if (decision !== a.verdict && reason === "") {
        $("#result").textContent = "Elige una razón para discrepar del agente.";
        return;
      }
      decisionRecord = {
        decision,
        reason:
          reason === ""
            ? "Coincide con el agente"
            : C.disagreementReasons[+reason],
      };
      showReport();
    }
  };
}
document.addEventListener("click", (e) => {
  const img = e.target.closest(".photo-grid img");
  if (!img) return;
  $("#fullPhoto").src = img.src;
  $("#fullCaption").textContent = img.alt;
  $("#photoViewer").showModal();
});
$("#closePhoto").onclick = () => $("#photoViewer").close();
$("#capture").onclick = capture;
$("#land").onclick = land;
$("#returnBtn").onclick = returnToBase;
$("#pauseBtn").onclick = pause;
// XR opcional: MR preserva el vuelo y ofrece inspección de maqueta. Sin XR se mantiene el juego normal.
let hitSource = null,
  hitPose = null,
  xrSaved = null;
const reticle = new T.Mesh(
  new T.RingGeometry(0.07, 0.09, 32),
  new T.MeshBasicMaterial({ color: 0xc4f37a, side: T.DoubleSide }),
);
reticle.rotation.x = -Math.PI / 2;
reticle.visible = false;
scene.add(reticle);
async function enterXR() {
  if (!navigator.xr) {
    toast("WebXR no disponible. El juego normal sigue funcionando.");
    return;
  }
  try {
    const mode = (await navigator.xr.isSessionSupported("immersive-ar"))
      ? "immersive-ar"
      : "immersive-vr";
    if (!(await navigator.xr.isSessionSupported(mode))) {
      toast("No hay un modo XR compatible.");
      return;
    }
    const session = await navigator.xr.requestSession(mode, {
      optionalFeatures: ["local-floor", "hit-test"],
    });
    document.exitPointerLock?.();
    xrSaved = { position: rig.position.clone(), paused };
    paused = true;
    xrMode = mode;
    renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(session);
    if (mode === "immersive-ar") {
      scene.background = null;
      scene.fog = null;
      world.scale.setScalar(0.045);
      world.position.set(0, -0.5, -1);
      rig.position.set(0, 0, 0);
      rig.rotation.set(0, 0, 0);
      camera.rotation.set(0, 0, 0);
      if (session.requestHitTestSource) {
        try {
          hitSource = await session.requestHitTestSource({
            space: await session.requestReferenceSpace("viewer"),
          });
        } catch {
          toast("Sin detección de mesa: maqueta colocada delante de ti.");
        }
      }
    }
    session.addEventListener("select", () => {
      if (hitPose && mode === "immersive-ar") world.position.copy(hitPose);
    });
    session.addEventListener("end", () => {
      hitSource?.cancel();
      hitSource = null;
      hitPose = null;
      reticle.visible = false;
      world.scale.setScalar(1);
      world.position.set(0, 0, 0);
      rig.position.copy(xrSaved.position);
      paused = xrSaved.paused;
      xrMode = null;
      scene.background = new T.Color(environment.sky);
      scene.fog = new T.Fog(environment.sky, 40, 120);
      orient(0.1);
      clearKeys();
      toast("XR finalizado. Continúa tu misión en pantalla.");
    });
  } catch (e) {
    xrMode = null;
    paused = false;
    toast("No se pudo iniciar XR: " + e.message);
  }
}
$("#xr").onclick = enterXR;
function xrFrame(frame) {
  if (!hitSource || !frame) return;
  const result = frame.getHitTestResults(hitSource)[0];
  if (result) {
    const pose = result.getPose(renderer.xr.getReferenceSpace());
    if (pose) {
      hitPose = new T.Vector3(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z,
      );
      reticle.position.copy(hitPose);
      reticle.visible = true;
    }
  }
}
let hudClock = 0;
renderer.setAnimationLoop((t, frame) => {
  const dt = Math.min((t - last) / 1000 || 0, C.flight.dtMax);
  last = t;
  if (active && !paused) {
    move(dt);
    extras(dt);
    hudClock += dt;
    if (hudClock > 0.12) {
      updateHUD();
      hudClock = 0;
    }
  }
  if (environment.decorations)
    environment.decorations.forEach(
      (o, i) => (o.visible = Math.sin(t * 0.023 + i * 2) > 0),
    );
  if (humGain) {
    humGain.gain.value = active && !paused ? C.audio.gain : 0;
    hum.frequency.value = C.audio.humHz + velocity.length() * C.audio.speedHz;
  }
  xrFrame(frame);
  renderer.render(scene, camera);
});
onresize = () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
build(0);
rig.position.set(17, 12, 23);
camera.lookAt(0, 3, -6);
menu();
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .then((r) => {
      r.update();
      function notice() {
        if (r.waiting) {
          $("#updateNotice").hidden = false;
          $("#applyUpdate").onclick = () => {
            if (
              active &&
              !confirm(
                "Actualizar reinicia la misión y borra la SD virtual. ¿Continuar?",
              )
            )
              return;
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => location.reload(),
              { once: true },
            );
            r.waiting.postMessage("SKIP_WAITING");
          };
        }
      }
      notice();
      r.addEventListener("updatefound", () =>
        r.installing?.addEventListener("statechange", notice),
      );
    })
    .catch(() => {});

function degradePhoto(out) {
  const c = out.getContext("2d"),
    img = c.getImageData(0, 0, out.width, out.height),
    gain = 1 + (Math.random() * 2 - 1) * C.camera.exposureVariation;
  for (let i = 0; i < img.data.length; i += 4) {
    const noise = (Math.random() * 2 - 1) * C.camera.noiseAmplitude;
    for (let j = 0; j < 3; j++)
      img.data[i + j] = Math.max(
        0,
        Math.min(255, img.data[i + j] * gain + noise),
      );
  }
  c.putImageData(img, 0, 0);
  const blur = velocity.length() * C.camera.blurPxPerMps;
  if (blur > 0.1) {
    const copy = document.createElement("canvas");
    copy.width = out.width;
    copy.height = out.height;
    copy.getContext("2d").drawImage(out, 0, 0);
    c.globalAlpha = 0.25;
    for (const sign of [-1, 1]) c.drawImage(copy, sign * blur, 0);
    c.globalAlpha = 1;
  }
  return out.toDataURL("image/jpeg", C.camera.jpegQuality);
}
function preflight(l) {
  rig.position.copy(environment.base);
  rig.rotation.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  velocity.set(0, 0, 0);
  clearKeys();
  active = false;
  $("#panel").hidden = false;
  $("#panel").innerHTML =
    `<div class="eyebrow">PREVUELO / MPU6050 SIN MAGNETÓMETRO</div><h1>Base de calibración</h1><p>Dron quieto sobre H. Calibra durante ${C.imu.calibrationSeconds} s; sin calibración aumenta la deriva de yaw.</p><p><label><input id="checkBattery" type="checkbox"> Batería nueva / revisada</label></p><p><label><input id="checkSD" type="checkbox"> ${photos.length ? "SD de vuelo vacía; fotos anteriores archivadas en tierra" : "SD vacía y lista"}</label></p><button id="calibrate">Calibrar quieto ${C.imu.calibrationSeconds} s</button><p id="calState">Sin calibrar</p><button id="takeoff">Despegar sin calibrar</button>`;
  calibrated = false;
  let calibrating = false;
  $("#calibrate").onclick = async () => {
    if (calibrating) return;
    calibrating = true;
    $("#calibrate").disabled = true;
    for (let i = C.imu.calibrationSeconds; i > 0; i--) {
      $("#calState").textContent = `Quieto en base… ${i} s`;
      await new Promise((r) => setTimeout(r, 1000));
      if (!$("#calState")) return;
    }
    calibrated = true;
    $("#calState").textContent =
      "Calibración terminada. Cabeceo/alabeo fiables; yaw aún deriva.";
    $("#takeoff").textContent = "Despegar calibrado";
    calibrating = false;
  };
  $("#takeoff").onclick = () => {
    if (calibrating) return;
    if (!$("#checkBattery").checked || !$("#checkSD").checked) {
      $("#calState").textContent = "Completa batería y SD antes de despegar.";
      return;
    }
    start(l);
  };
}

function showReport() {
  const expected = C.scenarios[level].expected,
    quality = photos.length
      ? photos.reduce((s, p) => s + p.quality.score, 0) / photos.length / 100
      : 0,
    score = scoreSession({
      expected,
      decision: decisionRecord.decision,
      coverage: agentResult.coverage,
      quality,
      stats,
      photoCount: photos.length,
      goodCount: accepted(),
    });
  decisionRecord.score = score;
  $("#result").innerHTML =
    `<h2>${decisionRecord.decision === null ? "Informe parcial: INDETERMINADO" : score.critical ? "ERROR CRÍTICO: rojo clasificado como verde" : decisionRecord.decision === expected ? "Decisión acertada" : "Decisión distinta al escenario"}</h2><p>Tu decisión: ${LABELS[decisionRecord.decision] ?? "INDETERMINADO"} · escenario: ${LABELS[expected]} · agente: ${agentResult.label}.</p><p>${decisionRecord.reason}</p><h3>Puntaje ${score.total}/100</h3><p>Decisión ${score.decision}/${C.score.decision} · fotos ${score.photography.toFixed(1)}/${C.score.photo} · eficiencia ${score.efficiency.toFixed(1)}/${C.score.efficiency} · seguridad ${score.safety.toFixed(1)}/${C.score.safety}</p><p>${C.scenarios[level].collapse ? "Colapso modelado: no ingresar." : cases[level].explanation}</p><p>${DISCLAIMER}</p><h3>Informe: verdad de terreno revelada</h3><div class="report-table">${photos
      .map((p) => {
        const gt = truth.get(p.id),
          r = groundResults.find((r) => r.photoId === p.id),
          d = r?.detections.find((d) => !d.suspect && d.measure.measurable),
          m = d?.measure,
          minimum =
            C.measurement.minPixels *
            scaleMmPerPixel(gt.distanceMm, gt.angleDeg),
          target =
            ((gt.widthMm * focalPixels()) / C.measurement.minPixels) * 0.8;
        return `<article><h4>Foto ${p.id} · ${p.name}</h4><p>Real: ${gt.widthMm.toFixed(2)} mm · medido: ${m ? m.widthMm.toFixed(2) + " ± " + m.uncertaintyMm.toFixed(2) + " mm" : "no medible / no detectado"}.</p><p>Distancia real ${gt.distanceMm.toFixed(0)} mm / láser ${p.sensors.laser.valid ? p.sensors.laser.mm.toFixed(0) + " mm" : "inválido"} · ángulo real ${gt.angleDeg.toFixed(1)}° / estimado ${p.sensors.imu.wallAngleDeg.toFixed(1)}°.</p><p>${p.quality.reasons.join(" ") || "Foto de calidad aceptada."}</p><p>En esta distancia el mínimo de ${C.measurement.minPixels} píxeles equivale a ${minimum.toFixed(2)} mm. ${!m ? (target < C.laser.minMm ? "Esta fisura queda fuera de la resolución/rango del sistema: requiere otro método." : `Acércate a ${(Math.min(target, C.laser.maxMm) / 1000).toFixed(2)} m, centra un segmento y repite con luz y sin movimiento.`) : "Revisa la incertidumbre antes de usar un umbral."}</p></article>`;
      })
      .join(
        "",
      )}</div><p>Tiempo ${stats.seconds.toFixed(0)} s · salidas ${stats.flights} · roces ${stats.contacts} · choques ${stats.crashes}.</p><div id="exportArea"><p>Descarga imágenes SINTÉTICAS, no fotografías de edificios reales.</p><button id="downloadSession">Descargar ZIP: fotos + telemetría + verdad de terreno</button></div>`;
  $("#downloadSession").onclick = downloadSession;
}

function tickSensors(dt) {
  sensorAccumulator += dt;
  while (sensorAccumulator >= 1 / C.laser.hz) {
    sensorAccumulator -= 1 / C.laser.hz;
    sensorCache = readSensors(Date.now() - sensorAccumulator * 1000);
    lastSensorMs = performance.now();
  }
}
function initHum() {
  try {
    audio ??= new AudioContext();
    audio.resume();
    if (!hum) {
      hum = audio.createOscillator();
      humGain = audio.createGain();
      hum.type = "sawtooth";
      hum.connect(humGain);
      humGain.connect(audio.destination);
      humGain.gain.value = C.audio.gain;
      hum.start();
    }
  } catch {}
}
function alertTone() {
  try {
    initHum();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.frequency.value = C.audio.alertHz;
    g.gain.setValueAtTime(C.audio.alertGain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + C.audio.alertSeconds,
    );
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + C.audio.alertSeconds);
  } catch {}
}
function extras(dt) {
  if (tutorialActive) {
    let el = $("#tutorialHint");
    if (!el) {
      el = document.createElement("div");
      el.id = "tutorialHint";
      $("#hud").append(el);
    }
    const tips = [
      "1/4 · W/S y A/D desplazan. Q/E controlan altura. Suelta para estabilizar.",
      "2/4 · Mira el segmento marcado. F dispara tras 150 ms. Para capilares debes acercarte mucho.",
      "3/4 · Entra por ACCESO. T enciende la luz. Usa el hueco al frente-derecha para subir.",
      "4/4 · B guía a base; L aterriza. Solo en tierra se lee la SD y actúa el agente.",
    ];
    el.textContent =
      tips[
        Math.min(
          tips.length - 1,
          Math.floor(flightSeconds / C.tutorial.stepSeconds),
        )
      ];
    if (flightSeconds >= C.tutorial.seconds) {
      tutorialActive = false;
      el.remove();
      try {
        localStorage.setItem("dse-tutorial-2", "completo");
      } catch {}
    }
  } else $("#tutorialHint")?.remove();
  if (quakeEnabled && !quakeDone && flightSeconds >= C.quake.atSeconds) {
    quakeDone = true;
    quakeLeft = C.quake.durationSeconds;
    for (const p of photos) p.preReplica = true;
    for (const p of points) {
      p.best = null;
      p.state = "pendiente tras réplica";
    }
    alertTone();
    toast(
      "Réplica: la Fase 1 es provisional y debe repetirse. Repite los checkpoints después del evento.",
    );
    for (let i = 0; i < C.quake.debrisCount; i++) {
      const m = new T.Mesh(
        new T.DodecahedronGeometry(C.quake.debrisRadiusM),
        new T.MeshStandardMaterial({ color: 0x9a9686 }),
      );
      m.position
        .copy(rig.position)
        .add(
          new T.Vector3(
            (Math.random() - 0.5) * C.quake.debrisSpreadM,
            1 + Math.random(),
            (Math.random() - 0.5) * C.quake.debrisSpreadM,
          ),
        );
      world.add(m);
      fallingDebris.push(m);
    }
  }
  if (quakeLeft > 0) {
    quakeLeft -= dt;
    camera.rotation.z +=
      Math.sin(flightSeconds * C.quake.shakeHz) * C.quake.shakeRad;
    lastImpact = performance.now();
  }
  for (const m of fallingDebris)
    if (m.position.y > 0.1)
      m.position.y = Math.max(0.1, m.position.y - dt * C.quake.debrisSpeedMps);
}

function downloadSession() {
  const report = {
    synthetic: true,
    scenario: C.scenarios[level],
    agent: agentResult,
    decision: decisionRecord,
    stats,
    difficulty: difficultyKey,
    replica: quakeDone,
  };
  const files = sessionFiles({ photos, truth, report, config: C }),
    url = URL.createObjectURL(
      new Blob([zipStore(files)], { type: "application/zip" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "DSE-sesion-sintetica-" + Date.now() + ".zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function captureRegion(p) {
  const c = new T.PerspectiveCamera(
    VFOV,
    C.camera.width / C.camera.height,
    0.04,
    180,
  );
  cam().getWorldPosition(c.position);
  cam().getWorldQuaternion(c.quaternion);
  c.updateMatrixWorld(true);
  const tangent = new T.Vector3().crossVectors(up, p.normal).normalize(),
    v = [];
  for (const x of [-C.quality.roiHalfWidthM, C.quality.roiHalfWidthM])
    for (const y of [-C.quality.roiHalfHeightM, C.quality.roiHalfHeightM])
      v.push(
        p.position
          .clone()
          .addScaledVector(tangent, x)
          .addScaledVector(up, y)
          .project(c),
      );
  const minX = Math.max(0, Math.min(...v.map((p) => (p.x + 1) / 2))),
    maxX = Math.min(1, Math.max(...v.map((p) => (p.x + 1) / 2))),
    minY = Math.max(0, Math.min(...v.map((p) => (1 - p.y) / 2))),
    maxY = Math.min(1, Math.max(...v.map((p) => (1 - p.y) / 2)));
  return {
    x: minX,
    y: minY,
    w: Math.max(0, maxX - minX),
    h: Math.max(0, maxY - minY),
  };
}
