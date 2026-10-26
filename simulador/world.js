import { CONFIG as C } from "./config.js";
import * as T from "./vendor/three.module.js";
// Metros en todo el mundo. Los anchos de fisura se convierten explícitamente de mm a m.
export function createWorld(level = 0, interiors = false) {
  const group = new T.Group(),
    colliders = [],
    points = [],
    hazards = [],
    textures = [],
    decorations = [];
  const floors = C.world.floors[level],
    W = C.world.widthsM[level],
    D = C.world.depthsM[level],
    H = C.world.floorHeightM,
    fz = C.world.frontZ,
    bz = fz - D,
    height = floors * H,
    base = new T.Vector3(...C.world.base);
  let seed = 177 + level * 91;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function texture(kind) {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const ctx = c.getContext("2d");
    ctx.fillStyle =
      {
        brick: "#ae7051",
        plaster: "#d4c9ac",
        concrete: "#a4a49b",
        peeling: "#b7c2b5",
        asphalt: "#515957",
        wood: "#795d40",
      }[kind] || "#9fa494";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 22000; i++) {
      ctx.fillStyle = rand() > 0.5 ? "#ffffff0c" : "#12160d0c";
      const s = 1 + rand() * 4;
      ctx.fillRect(rand() * 1024, rand() * 1024, s, s);
    }
    if (kind === "brick") {
      ctx.strokeStyle = "#d2b99a";
      ctx.lineWidth = 7;
      for (let y = 0; y < 1024; y += 96) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
        for (let x = ((y / 96) % 2) * 128; x < 1024; x += 256) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 96);
          ctx.stroke();
        }
      }
    }
    if (kind === "peeling") {
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = i % 3 ? "#d1d0b7" : "#7e8b80";
        ctx.beginPath();
        const x = rand() * 1024,
          y = rand() * 1024;
        ctx.moveTo(x, y);
        for (let j = 0; j < 7; j++)
          ctx.lineTo(x + (rand() - 0.5) * 80, y + (rand() - 0.5) * 80);
        ctx.fill();
      }
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    textures.push(t);
    return t;
  }
  const materials = {};
  for (const k of [
    "brick",
    "plaster",
    "concrete",
    "peeling",
    "asphalt",
    "wood",
  ])
    materials[k] = new T.MeshStandardMaterial({
      map: texture(k),
      roughness: 0.96,
    });
  function mat(c) {
    return (
      materials[c] || new T.MeshStandardMaterial({ color: c, roughness: 0.88 })
    );
  }
  function box(w, h, d, x, y, z, color = "concrete", solid = true) {
    const geo = new T.BoxGeometry(w, h, d),
      pos = geo.attributes.position,
      n = geo.attributes.normal,
      uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(n.getX(i)),
        ny = Math.abs(n.getY(i));
      uv.setXY(
        i,
        (nx > 0.5 ? pos.getZ(i) : pos.getX(i)) / 2,
        (ny > 0.5 ? pos.getZ(i) : pos.getY(i)) / 2,
      );
    }
    const m = new T.Mesh(geo, mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    if (solid) colliders.push(m);
    if (color === "#335661") m.userData.glass = true;
    return m;
  }
  function rod(a, b, r, color, solid = false) {
    const v = b.clone().sub(a),
      m = new T.Mesh(new T.CylinderGeometry(r, r, v.length(), 7), mat(color));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
    m.userData.sensorTarget = true;
    m.castShadow = true;
    group.add(m);
    if (solid) colliders.push(m);
    if (color === "#335661") m.userData.glass = true;
    return m;
  }
  function polyline(vertices, r, color) {
    for (let i = 1; i < vertices.length; i++)
      rod(vertices[i - 1], vertices[i], r, color);
  }
  function debris(x, z, n = 10, spread = 2) {
    for (let i = 0; i < n; i++) {
      const s = 0.15 + rand() * 0.55,
        m = new T.Mesh(
          new T.DodecahedronGeometry(s, 0),
          mat(i % 3 ? "concrete" : "brick"),
        );
      m.scale.set(1, 0.4 + rand() * 0.5, 0.7);
      m.position.set(
        x + (rand() - 0.5) * spread,
        s * 0.4,
        z + (rand() - 0.5) * spread,
      );
      m.rotation.set(rand(), rand() * 6, rand());
      group.add(m);
      m.castShadow = true;
      if (s > 0.4) colliders.push(m);
    }
  }
  function point(
    name,
    x,
    y,
    z,
    width,
    inside = false,
    normal = new T.Vector3(0, 0, 1),
    pattern = "diagonal",
  ) {
    width = C.scenarios[level].widths[points.length] ?? width;
    const p = {
      name,
      position: new T.Vector3(x, y, z),
      normal,
      width,
      inside,
      light: inside ? 0.18 : 1,
    };
    points.push(p);
    crack(p, pattern);
    return p;
  }
  function crack(p, pattern) {
    const tangent = new T.Vector3()
      .crossVectors(new T.Vector3(0, 1, 0), p.normal)
      .normalize();
    const traces = pattern === "x" ? [-1, 1] : [1];
    for (const sign of traces) {
      for (let j = 0; j < 8; j++) {
        const a = p.position
          .clone()
          .addScaledVector(
            tangent,
            sign * (-0.13 + j * 0.035 + (j % 2 ? 0.014 : -0.014)),
          )
          .addScaledVector(new T.Vector3(0, 1, 0), -0.28 + j * 0.07);
        const b = p.position
          .clone()
          .addScaledVector(
            tangent,
            sign * (-0.13 + (j + 1) * 0.035 + ((j + 1) % 2 ? 0.014 : -0.014)),
          )
          .addScaledVector(new T.Vector3(0, 1, 0), -0.28 + (j + 1) * 0.07);
        const delta = b.clone().sub(a),
          cross = new T.Vector3()
            .crossVectors(delta, p.normal)
            .normalize()
            .multiplyScalar(p.width / 2000),
          verts = [];
        for (const v of [
          a.clone().add(cross),
          a.clone().sub(cross),
          b.clone().add(cross),
          b.clone().add(cross),
          a.clone().sub(cross),
          b.clone().sub(cross),
        ])
          verts.push(v.x, v.y, v.z);
        const geometry = new T.BufferGeometry();
        geometry.setAttribute(
          "position",
          new T.Float32BufferAttribute(verts, 3),
        );
        geometry.computeVertexNormals();
        group.add(
          new T.Mesh(
            geometry,
            new T.MeshBasicMaterial({ color: 0x242623, side: T.DoubleSide }),
          ),
        );
      }
    }
  }
  // Voie, andenes y contexto urbano.
  box(90, 0.2, 90, 0, -0.18, 0, "#788574");
  box(70, 0.06, 12, 0, -0.03, 1, "asphalt");
  box(40, 0.16, 2.6, 0, 0.04, -3.5, "concrete");
  for (let x = -28; x < 30; x += 6)
    box(2, 0.015, 0.12, x, 0.012, 1, "#d8cf9d", false);
  // Sótano visual / piso de planta baja, siempre sólido.
  box(W + 0.5, 0.22, D + 0.5, 0, 0.04, (fz + bz) / 2, "concrete");
  const bays = level === 0 ? 3 : 4,
    bay = W / bays;
  for (let floor = 0; floor < floors; floor++) {
    const y = floor * H,
      soft = level === 2 && floor === 0;
    // Fachada segmentada: huecos auténticos cuando se habilitan interiores.
    for (let b = 0; b < bays; b++) {
      const x = -W / 2 + (b + 0.5) * bay,
        door = floor === 0 && b === Math.floor(bays / 2),
        openW = door ? 1.8 : 1.9,
        openH = door ? 2.45 : 1.5,
        sill = door ? 0 : 0.95;
      const c = level === 0 ? (floor === 0 ? "brick" : "plaster") : "peeling";
      if (!soft) {
        box(
          (bay - openW) / 2,
          H,
          0.28,
          x - (bay + openW) / 4,
          y + H / 2,
          fz,
          c,
        );
        box(
          (bay - openW) / 2,
          H,
          0.28,
          x + (bay + openW) / 4,
          y + H / 2,
          fz,
          c,
        );
        if (sill) box(openW, sill, 0.28, x, y + sill / 2, fz, c);
        const header = H - sill - openH;
        box(openW, header, 0.28, x, y + sill + openH + header / 2, fz, c);
      }
      const broken =
        interiors && (door || (b === 0 && floor <= 1) || level === 2);
      if (!soft && !broken) {
        box(
          openW,
          openH,
          0.06,
          x,
          y + sill + openH / 2,
          fz + 0.06,
          door ? "wood" : "#335661",
          true,
        );
        if (!door) {
          box(
            0.045,
            openH,
            0.08,
            x,
            y + sill + openH / 2,
            fz + 0.12,
            "#c2ccbb",
            false,
          );
          box(
            openW,
            0.045,
            0.08,
            x,
            y + sill + openH / 2,
            fz + 0.12,
            "#c2ccbb",
            false,
          );
        }
      }
      if (!soft) {
        box(
          openW + 0.15,
          0.09,
          0.14,
          x,
          y + sill + openH + 0.03,
          fz + 0.13,
          "concrete",
          false,
        );
        if (!door)
          box(
            openW + 0.3,
            0.09,
            0.38,
            x,
            y + sill - 0.02,
            fz + 0.1,
            "concrete",
            false,
          );
      }
    }
    for (const side of [-1, 1])
      box(
        0.28,
        H,
        D,
        (side * W) / 2,
        y + H / 2,
        (fz + bz) / 2,
        level === 0 ? "brick" : "peeling",
      );
    box(W, H, 0.28, 0, y + H / 2, bz, level === 0 ? "plaster" : "peeling");
    // Losas: el hueco de escalera interior se añade en 1C.
    if (!interiors || floor === floors - 1)
      box(W + 0.4, 0.2, D + 0.4, 0, y + H, (fz + bz) / 2, "concrete");
    else {
      const holeX = W / 2 - 1.7;
      box(W - 3.4, 0.2, D, -1.7, y + H, (fz + bz) / 2, "concrete");
      box(3.4, 0.2, D - 3.4, holeX, y + H, (fz + bz - 3.4) / 2, "concrete");
    }
    if (level > 0) {
      for (let j = 0; j <= bays; j++) {
        const x = -W / 2 + j * bay;
        if (!(soft && j === bays)) {
          const col = box(0.44, H, 0.5, x, y + H / 2, fz + 0.04, "concrete");
          if (soft && j === bays - 1) col.rotation.z = 0.16;
        }
        box(0.42, H, 0.42, x, y + H / 2, bz, "concrete");
      }
      box(W + 0.4, 0.34, 0.5, 0, y + H - 0.08, fz + 0.04, "concrete");
    }
  }
  if (level === 0) {
    for (const sign of [-1, 1]) {
      const roof = box(
        W / 2 + 0.7,
        0.16,
        D + 1,
        sign * (W / 4),
        height + 0.65,
        (fz + bz) / 2,
        "#9d533d",
      );
      roof.rotation.z = -sign * 0.24;
    }
    box(0.22, 0.2, D + 1, 0, height + 1.28, (fz + bz) / 2, "#a86846");
    box(1, 0.7, 1, -2, height + 0.8, bz + 2, "brick");
  } else {
    box(W, 0.55, 0.25, 0, height + 0.3, bz, "concrete");
    box(W - 3, 0.55, 0.25, -1.5, height + 0.3, fz, "concrete");
    box(0.25, 0.55, D, -W / 2, height + 0.3, (fz + bz) / 2, "concrete");
  }
  // Fisuras exteriores: superficies no obstruidas, frente a paños y columnas.
  if (level === 0) {
    point(
      "E1 · Friso bajo ventana",
      -W / 3,
      0.6,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      0.2,
    );
    point(
      "E2 · Paño de ladrillo",
      -1.55,
      1.5,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      0.35,
    );
    point(
      "E3 · Friso planta alta",
      1.55,
      4.4,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      0.5,
    );
    point(
      "E4 · Encuentro de fachada",
      W / 3,
      3.6,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      0.3,
    );
    for (let i = 0; i < 5; i++) {
      const stain = box(
        0.45,
        0.6,
        0.008,
        -4 + i * 1.6,
        0.5 + (i % 2) * 3,
        fz + 0.147,
        "#899280",
        false,
      );
      stain.material.transparent = true;
      stain.material.opacity = 0.28;
    }
    // Sombras de cable: marcas oscuras deliberadamente más anchas, sin checkpoint de grieta.
    const shadow = box(6, 0.022, 0.005, 0, 5.4, fz + 0.148, "#6b6b58", false);
    shadow.rotation.z = -0.18;
  } else if (level === 1) {
    point(
      "E1 · Muro con fisuración diagonal",
      -W / 2 + bay * 0.5,
      0.52,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      2.1,
      false,
      undefined,
      "x",
    );
    point(
      "E2 · Paño de planta 2",
      C.inspection.yellowWallX,
      4.4,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      2.7,
      false,
      undefined,
      "x",
    );
    point(
      "E3 · Columna de esquina",
      W / 2,
      C.inspection.yellowColumnY,
      fz + 0.29 + C.quality.surfaceEpsilonM,
      3,
    );
    point(
      "E4 · Paño bajo ventana",
      W / 2 - bay * 0.5,
      6.5,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      2.4,
      false,
      undefined,
      "x",
    );
  } else {
    point(
      "E1 · Columna fisurada del piso blando",
      -W / 2,
      1.45,
      fz + 0.29 + C.quality.surfaceEpsilonM,
      14,
    );
    point(
      "E2 · Muro diagonal planta 2",
      C.inspection.redWallX,
      4.45,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      18,
      false,
      undefined,
      "x",
    );
    point(
      "E3 · Junta desplazada planta 3",
      W / 2 - 2,
      6.5,
      fz + 0.14 + C.quality.surfaceEpsilonM,
      11,
    );
    point(
      "E4 · Columna con pérdida de sección",
      0,
      C.inspection.redColumnY,
      fz + 0.29 + C.quality.surfaceEpsilonM,
      22,
    );
  }
  if (level >= 1) {
    const cx = level === 1 ? W / 2 : 0;
    box(0.49, 0.9, 0.08, cx, 1.25, fz + 0.26, "#534c40", false);
    for (let j = -1; j <= 1; j++)
      rod(
        new T.Vector3(cx + j * 0.11, 0.78, fz + 0.32),
        new T.Vector3(cx + j * 0.11, 1.85, fz + 0.32),
        0.014,
        "#704b34",
      );
    for (let j = 0; j < 4; j++)
      box(0.42, 0.018, 0.04, cx, 0.9 + j * 0.22, fz + 0.32, "#775437", false);
    debris(W / 2 - 1, fz + 1.2, 17, 3.5);
    if (level === 1) {
      const parapet = box(2.6, 0.3, 0.6, W / 2 - 1, 0.32, fz + 1.4, "concrete");
      parapet.rotation.y = 0.3;
    }
  }
  if (level === 2) {
    // Silueta inestable: losas desplazadas y apoyadas en una esquina, sin solapar la ruta central.
    for (let i = 0; i < 3; i++) {
      const slab = box(
        5,
        0.24,
        D - 1,
        W / 2 + 1 + i * 0.15,
        4.7 + i * 2.4,
        (fz + bz) / 2,
        "concrete",
      );
      slab.rotation.z = -0.22;
      const wall = box(
        0.25,
        2.5,
        D - 1,
        W / 2 + 3 + i * 0.12,
        6 + i * 2.4,
        (fz + bz) / 2,
        "peeling",
      );
      wall.rotation.z = -0.17;
    }
    for (let i = 0; i < 3; i++) {
      const broken = box(0.55, 1.4, 0.55, W / 2 - i * 0.5, 0.8, fz, "concrete");
      broken.rotation.z = 0.65;
    }
    debris(W / 2 + 1, 0, 36, 9);
    debris(-2, -1, 20, 5);
    const hazard = box(2.5, 0.25, 2.3, 3, 0.65, fz - 2, "concrete");
    hazard.rotation.z = 0.3;
    hazards.push(new T.Box3().setFromObject(hazard));
  }

  if (interiors) {
    // Pasillo longitudinal libre, divisiones a la izquierda y hueco vertical de 3,4 m al frente-derecha.
    const partitionZ = fz - D * 0.54;
    for (let f = 0; f < floors; f++) {
      const y = f * H;
      box(W / 2 - 1, 2.75, 0.16, -W / 4 - 0.5, y + 1.5, partitionZ, "peeling");
      box(0.16, 2.75, D * 0.3, -W / 4, y + 1.5, bz + D * 0.15, "plaster");
      // Mobiliario fuera del pasillo y de la línea de tiro de los checkpoints.
      const table = box(
        1.3,
        0.12,
        0.65,
        -W / 2 + 1.1,
        y + 0.75,
        partitionZ + 1,
        "wood",
      );
      for (const dx of [-0.5, 0.5])
        box(
          0.07,
          0.7,
          0.5,
          -W / 2 + 1.1 + dx,
          y + 0.37,
          partitionZ + 1,
          "wood",
        );
      const chair = box(
        0.55,
        0.6,
        0.55,
        -W / 2 + 2,
        y + 0.35,
        partitionZ + 1.4,
        "#5d6b60",
      );
      chair.rotation.z = 0.5;
      box(1.6, 0.7, 0.7, -W / 2 + 1, y + 0.4, bz + 1, "#6e7367");
      // Escalones truncados a un lado del hueco: el dron asciende por el espacio libre adyacente.
      if (f < floors - 1) {
        for (let j = 0; j < 6; j++)
          box(
            0.65,
            0.12,
            0.35,
            W / 2 - 0.6,
            y + 0.35 + j * 0.4,
            fz - 0.5 - j * 0.42,
            "concrete",
          );
        box(0.06, 0.5, 2.7, W / 2 - 3.45, y + 3.3, fz - 1.9, "#778773");
      }
      if (level >= 1) {
        box(0.42, H, 0.42, -W / 2 + 2, y + 1.5, partitionZ - 0.3, "concrete");
        if (f === 0) {
          box(
            0.46,
            0.65,
            0.05,
            -W / 2 + 2,
            1.3,
            partitionZ - 0.06,
            "#574e42",
            false,
          );
          for (let k = -1; k <= 1; k++)
            rod(
              new T.Vector3(-W / 2 + 2 + k * 0.1, 0.9, partitionZ - 0.02),
              new T.Vector3(-W / 2 + 2 + k * 0.1, 1.8, partitionZ - 0.02),
              0.012,
              "#72513e",
            );
        }
      }
      if (level > 0) debris(-W / 2 + 1, partitionZ + 1, 5 + level * 3, 1.5);
    }
    point(
      "I1 · Divisorio interior / planta baja",
      -W / 2 + 1.1,
      1.5,
      partitionZ + 0.08 + C.quality.surfaceEpsilonM,
      [0.3, 2.6, 12][level],
      true,
      undefined,
      level ? "x" : "diagonal",
    );
    point(
      "I2 · Muro posterior / planta baja",
      0.65,
      1.5,
      bz + 0.14 + C.quality.surfaceEpsilonM,
      [0.4, 2.3, 16][level],
      true,
    );
    point(
      "I3 · Muro interior / planta 2",
      0.65,
      4.5,
      bz + 0.14 + C.quality.surfaceEpsilonM,
      [0.25, 2.9, 21][level],
      true,
      undefined,
      level ? "x" : "diagonal",
    );
    if (level >= 1) {
      // Grieta geométrica en losa: orientada en horizontal, sin líneas de ancho artificial.
      for (let j = 0; j < 7; j++) {
        const m = box(
          0.003 + level * 0.004,
          0.002,
          0.24,
          -2 + j * 0.15,
          3.112,
          bz + 2 + j * 0.15,
          "#282d28",
          false,
        );
        m.rotation.y = 0.4;
      }
    }
    if (level === 2) {
      const fallen = box(
        2.1,
        0.2,
        2,
        -W / 2 + 1.8,
        2.1,
        partitionZ - 1,
        "concrete",
      );
      fallen.rotation.z = 0.28;
      hazards.push(new T.Box3().setFromObject(fallen));
      for (let j = 0; j < 6; j++) {
        const stripe = box(
          0.23,
          0.012,
          0.15,
          -W / 2 + 0.8 + j * 0.36,
          0.19,
          partitionZ + 0.2,
          j % 2 ? "#222c2a" : "#e8b650",
          false,
        );
      }
    }
    // Indicador de acceso sin revelar la clasificación.
    const doorX =
      -W / 2 + ((level === 2 ? 1 : Math.floor(bays / 2)) + 0.5) * bay;
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sc = signCanvas.getContext("2d");
    sc.fillStyle = "#21483e";
    sc.fillRect(0, 0, 512, 128);
    sc.fillStyle = "#e4eed2";
    sc.font = "bold 35px sans-serif";
    sc.textAlign = "center";
    sc.fillText("ACCESO → INTERIOR", 256, 78);
    const sign = new T.Mesh(
      new T.PlaneGeometry(1.8, 0.45),
      new T.MeshBasicMaterial({ map: new T.CanvasTexture(signCanvas) }),
    );
    sign.position.set(doorX, 2.7, fz + 0.2);
    group.add(sign);
  }

  // Base de despegue: carpa, mesa, equipo y zona H.
  box(3.8, 0.05, 3.8, base.x, 0.035, base.z, "#d4e9a4", false);
  const label = document.createElement("canvas");
  label.width = label.height = 256;
  const lc = label.getContext("2d");
  lc.fillStyle = "#193e41";
  lc.font = "bold 180px sans-serif";
  lc.textAlign = "center";
  lc.fillText("H", 128, 194);
  const hm = new T.Mesh(
    new T.PlaneGeometry(2.3, 2.3),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(label),
      transparent: true,
    }),
  );
  hm.rotation.x = -Math.PI / 2;
  hm.position.set(base.x, 0.069, base.z);
  group.add(hm);
  const tentX = -6,
    tentZ = 11;
  for (const x of [-2, 2])
    for (const z of [-1.7, 1.7])
      box(0.07, 2.7, 0.07, tentX + x, 1.35, tentZ + z, "#c6cfc3");
  const tent = box(4.6, 0.12, 4.1, tentX, 2.75, tentZ, "#e5d9b2");
  tent.rotation.z = 0.04;
  box(2, 0.13, 0.9, tentX, 0.9, tentZ, "wood");
  for (const x of [-0.8, 0.8])
    box(0.06, 0.9, 0.65, tentX + x, 0.45, tentZ, "#34494c");
  box(0.8, 0.55, 0.08, tentX, 1.25, tentZ - 0.12, "#203b40");
  box(0.64, 0.37, 0.02, tentX, 1.25, tentZ - 0.06, "#8ed0ae", false);
  box(0.4, 0.18, 0.3, tentX + 0.75, 1.08, tentZ, "#8b9894");
  // Postes, cables, vehículos y vegetación (deterministas, sin descargas).
  for (const x of [-15, 15]) {
    box(0.18, 8, 0.18, x, 4, -1, "wood");
    box(1.9, 0.12, 0.12, x, 7.2, -1, "#767c71");
  }
  const wire = [
    new T.Vector3(-15, 7.4, -1),
    new T.Vector3(0, 6.2, -1),
    new T.Vector3(15, 7.4, -1),
  ];
  polyline(wire, 0.022, "#313c3b");
  if (level === 2) {
    polyline(
      [
        new T.Vector3(15, 7, -1),
        new T.Vector3(12, 2, -0.5),
        new T.Vector3(10, 0.6, 1),
      ],
      0.028,
      "#292c2a",
    );
    for (let i = 0; i < 9; i++) {
      const spark = rod(
        new T.Vector3(10, 0.65, 1),
        new T.Vector3(
          10 + (rand() - 0.5) * 0.7,
          0.65 + rand() * 0.8,
          1 + (rand() - 0.5) * 0.5,
        ),
        0.012,
        "#ffe39a",
      );
      spark.material = new T.MeshBasicMaterial({ color: 0xffe294 });
      decorations.push(spark);
    }
  }
  function car(x, z, c) {
    box(1.7, 0.65, 3.4, x, 0.55, z, c);
    box(1.5, 0.65, 1.7, x, 1.12, z - 0.15, "#536c73");
    box(1.52, 0.05, 1.75, x, 1.47, z - 0.15, c);
    for (const a of [-0.8, 0.8])
      for (const b of [-1.05, 1.05]) {
        const wheel = new T.Mesh(
          new T.CylinderGeometry(0.31, 0.31, 0.17, 12),
          mat("#242c2b"),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x + a, 0.35, z + b);
        group.add(wheel);
      }
  }
  car(-11, 2, "#b6b99f");
  car(13, 2, level === 2 ? "#925e49" : "#527877");
  function tree(x, z) {
    box(0.23, 2.6, 0.23, x, 1.3, z, "wood");
    for (let i = 0; i < 3; i++) {
      const leaf = new T.Mesh(
        new T.IcosahedronGeometry(1.25, 1),
        mat(i % 2 ? "#6f8862" : "#526f53"),
      );
      leaf.position.set(x + (i - 1) * 0.5, 2.7 + i * 0.4, z);
      group.add(leaf);
    }
  }
  for (let i = 0; i < 5; i++) tree(-18 + i * 8, bz - 5);
  if (level === 0) {
    box(W + 1, 0.18, 2.2, 0, 0.04, fz + 1.5, "#6b8656");
    for (let i = 0; i < 7; i++) {
      if (Math.abs(-4 + i * 1.3) < 1.1) continue;
      const bush = new T.Mesh(
        new T.IcosahedronGeometry(0.35, 1),
        mat("#667c4d"),
      );
      bush.position.set(-4 + i * 1.3, 0.4, fz + 1.7);
      group.add(bush);
    }
    box(1.8, 0.04, 3.4, 0, 0.16, fz + 1.5, "concrete");
  }
  if (level > 0) debris(-W / 2 - 1, fz + 1.4, 12 + level * 6, 4);
  for (const x of [-26, 25])
    box(7, 8 + level * 2, 8, x, 4 + level, bz + 2, "#87938b");
  return {
    group,
    colliders,
    points,
    base,
    height,
    hazards,
    textures,
    decorations,
    sky: ["#bcd5db", "#b5b4a4", "#8a939b"][level],
    light: [1, 0.8, 0.6][level],
    indoor: (p) =>
      p.x > -W / 2 &&
      p.x < W / 2 &&
      p.z < fz - 0.3 &&
      p.z > bz + 0.3 &&
      p.y < height,
    interiors,
    dimensions: { W, D, fz, bz, floors },
  };
}
