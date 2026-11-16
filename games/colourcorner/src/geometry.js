export const PAGE_W = 300;
export const PAGE_H = 360;
export const MIN_CLEARANCE = 5;

const STEP = 2;
const ROUND = 32;
const CURVE = 10;
const outlines = new WeakMap();
const boxes = new WeakMap();
const zones = new WeakMap();

function ellipsePoints(x, y, rx, ry) {
  return Array.from({ length: ROUND }, (_, at) => [x + Math.cos((at / ROUND) * Math.PI * 2) * rx, y + Math.sin((at / ROUND) * Math.PI * 2) * ry]);
}

function roundPoints(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  const corners = [[x + w - r, y + r, -0.5], [x + w - r, y + h - r, 0], [x + r, y + h - r, 0.5], [x + r, y + r, 1]];
  return corners.flatMap(([cx, cy, start]) => Array.from({ length: 5 }, (_, at) => {
    const angle = (start + at / 8) * Math.PI;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  }));
}

function pathPoints(commands) {
  const parts = [];
  let part = null;
  let last = [0, 0];
  for (const [op, ...v] of commands) {
    if (op === "M") parts.push((part = [[v[0], v[1]]]));
    else if (op === "L") part.push([v[0], v[1]]);
    else if (op === "Q" || op === "C") {
      for (let step = 1; step <= CURVE; step += 1) {
        const t = step / CURVE;
        const u = 1 - t;
        const ends = op === "Q" ? [[u * u, 2 * u * t, t * t], [last, [v[0], v[1]], [v[2], v[3]]]] : [[u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t], [last, [v[0], v[1]], [v[2], v[3]], [v[4], v[5]]]];
        const [weights, points] = ends;
        part.push([0, 1].map((axis) => weights.reduce((sum, weight, at) => sum + weight * points[at][axis], 0)));
      }
    }
    if (op !== "Z") last = part.at(-1);
  }
  return parts;
}

export function outline(region) {
  if (!outlines.has(region)) {
    const v = region.v;
    const parts = region.k === "e" ? [ellipsePoints(...v)] : region.k === "r" ? [roundPoints(...v)] : region.k === "p" ? [v.reduce((points, value, at) => (at % 2 ? points : [...points, [value, v[at + 1]]]), [])] : pathPoints(v);
    outlines.set(region, parts);
  }
  return outlines.get(region);
}

function boxOf(region) {
  if (!boxes.has(region)) {
    const points = outline(region).flat();
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    boxes.set(region, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
  }
  return boxes.get(region);
}

function inPart(points, x, y) {
  let inside = false;
  for (let at = 0, before = points.length - 1; at < points.length; before = at, at += 1) {
    const [xi, yi] = points[at];
    const [xj, yj] = points[before];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function contains(region, x, y) {
  const [left, top, right, bottom] = boxOf(region);
  if (x < left || x > right || y < top || y > bottom) return false;
  return outline(region).some((part) => inPart(part, x, y));
}

export function zoneAt(page, x, y) {
  if (x < 0 || y < 0 || x > PAGE_W || y > PAGE_H) return -1;
  for (let at = page.regions.length - 1; at >= 0; at -= 1) if (contains(page.regions[at], x, y)) return at;
  return -1;
}

function labelGrid(page, columns, rows) {
  const labels = new Int16Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) labels[row * columns + column] = zoneAt(page, column * STEP, row * STEP);
  }
  return labels;
}

function distances(labels, columns, rows) {
  const far = new Float32Array(labels.length).fill(Infinity);
  const edge = (column, row) => column === 0 || row === 0 || column === columns - 1 || row === rows - 1;
  const passes = [[[-1, 0, 1], [0, -1, 1], [-1, -1, 1.4], [1, -1, 1.4]], [[1, 0, 1], [0, 1, 1], [1, 1, 1.4], [-1, 1, 1.4]]];
  for (let at = 0; at < labels.length; at += 1) if (edge(at % columns, Math.floor(at / columns))) far[at] = 1;
  passes.forEach((near, pass) => {
    for (let step = 0; step < labels.length; step += 1) {
      const at = pass ? labels.length - 1 - step : step;
      const column = at % columns;
      const row = Math.floor(at / columns);
      for (const [dx, dy, cost] of near) {
        const other = (row + dy) * columns + column + dx;
        if (column + dx < 0 || column + dx >= columns || row + dy < 0 || row + dy >= rows) continue;
        const reach = labels[other] === labels[at] ? far[other] + cost : cost;
        if (reach < far[at]) far[at] = reach;
      }
    }
  });
  return far;
}

export function zonesOf(page) {
  if (zones.has(page)) return zones.get(page);
  const columns = Math.floor(PAGE_W / STEP) + 1;
  const rows = Math.floor(PAGE_H / STEP) + 1;
  const labels = labelGrid(page, columns, rows);
  const far = distances(labels, columns, rows);
  const found = page.regions.map(() => ({ anchor: null, clearance: 0 }));
  for (let at = 0; at < labels.length; at += 1) {
    const zone = found[labels[at]];
    if (!zone) continue;
    const clearance = (far[at] - 0.5) * STEP;
    if (clearance > zone.clearance) Object.assign(zone, { clearance, anchor: [(at % columns) * STEP, Math.floor(at / columns) * STEP] });
  }
  const frozen = Object.freeze(found.map((zone) => Object.freeze(zone)));
  zones.set(page, frozen);
  return frozen;
}

export function required(page) {
  return zonesOf(page).flatMap((zone, at) => (zone.clearance >= MIN_CLEARANCE ? [at] : []));
}
