// A* 3D sobre las mismas cajas de colisión que usa el vuelo; sin atravesar muros.
export function planRoute(T, start, goal, boxes, maxY, step = 0.5) {
  const clear = (a, b) => {
    const d = b.clone().sub(a),
      len = d.length();
    const ray = new T.Ray(a, d.normalize());
    return !boxes.some((box) => {
      if (box.containsPoint(a) || box.containsPoint(b)) return true;
      const hit = ray.intersectBox(box, new T.Vector3());
      return hit && hit.distanceTo(a) <= len;
    });
  };
  if (clear(start, goal)) return [goal.clone()];
  const point = (a) => new T.Vector3(...a.map((n) => n * step));
  const grid = (v) => v.toArray().map((n) => Math.round(n / step));
  const key = (a) => a.join(",");
  const begin = grid(start),
    end = grid(goal),
    open = [],
    cost = new Map(),
    parent = new Map(),
    nodes = new Map();
  const h = (a) => Math.hypot(...a.map((v, i) => v - end[i]));
  const push = (n) => {
    open.push(n);
    let i = open.length - 1;
    while (i) {
      let p = (i - 1) >> 1;
      if (open[p].f <= n.f) break;
      open[i] = open[p];
      i = p;
    }
    open[i] = n;
  };
  const pop = () => {
    const top = open[0],
      n = open.pop();
    if (open.length) {
      let i = 0;
      while (i * 2 + 1 < open.length) {
        let c = i * 2 + 1;
        if (c + 1 < open.length && open[c + 1].f < open[c].f) c++;
        if (open[c].f >= n.f) break;
        open[i] = open[c];
        i = c;
      }
      open[i] = n;
    }
    return top;
  };
  // La primera conexión también se comprueba, evitando saltos a través de un muro.
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const a = begin.map((v, i) => v + [x, y, z][i]),
          p = point(a);
        if (p.y >= 0.4 && clear(start, p)) {
          const k = key(a);
          cost.set(k, 0);
          nodes.set(k, a);
          push({ a, k, g: 0, f: h(a) });
        }
      }
  let found = null,
    iterations = 0;
  while (open.length && iterations++ < 180000) {
    const n = pop();
    if (n.g !== cost.get(n.k)) continue;
    const p = point(n.a);
    if (p.distanceTo(goal) < 1.2 && clear(p, goal)) {
      found = n.k;
      break;
    }
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        const a = [...n.a];
        a[axis] += sign;
        const v = point(a);
        if (
          Math.abs(v.x) > 30 ||
          Math.abs(v.z) > 35 ||
          v.y < 0.4 ||
          v.y > maxY ||
          !clear(p, v)
        )
          continue;
        const k = key(a),
          g = n.g + 1;
        if (g >= (cost.get(k) ?? Infinity)) continue;
        cost.set(k, g);
        parent.set(k, n.k);
        nodes.set(k, a);
        push({ a, k, g, f: g + h(a) });
      }
  }
  if (!found)
    throw Error("No se encontró una ruta libre. Puedes jugar manualmente.");
  const path = [goal.clone()];
  for (let k = found; k; k = parent.get(k)) path.unshift(point(nodes.get(k)));
  const result = [];
  let from = start;
  for (let i = 0; i < path.length;) {
    let j = i;
    while (j + 1 < path.length && clear(from, path[j + 1])) j++;
    result.push(path[j]);
    from = path[j];
    i = j + 1;
  }
  return result;
}
