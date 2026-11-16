export function pointTracker() {
  const points = [];
  const fills = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const apply = ([a, b, c, d, e, f], x, y) => [a * x + c * y + e, b * x + d * y + f];
  const at = (x, y) => points.push(apply(matrix, x, y));
  const multiply = ([a2, b2, c2, d2, e2, f2]) => {
    const [a, b, c, d, e, f] = matrix;
    matrix = [a * a2 + c * b2, b * a2 + d * b2, a * c2 + c * d2, b * c2 + d * d2, a * e2 + c * f2 + e, b * e2 + d * f2 + f];
  };
  const box = (x, y, width, height) => [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].forEach(([px, py]) => at(px, py));
  const state = {};
  const methods = {
    save: () => stack.push({ matrix, alpha: state.globalAlpha }),
    restore: () => {
      const saved = stack.pop();
      matrix = saved.matrix;
      state.globalAlpha = saved.alpha;
    },
    translate: (x, y) => multiply([1, 0, 0, 1, x, y]),
    rotate: (angle) => multiply([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]),
    scale: (x, y) => multiply([x, 0, 0, y, 0, 0]),
    transform: (a, b, c, d, e, f) => multiply([a, b, c, d, e, f]),
    setTransform: (a, b, c, d, e, f) => {
      matrix = [a, b, c, d, e, f];
    },
    moveTo: at,
    lineTo: at,
    quadraticCurveTo: (x1, y1, x, y) => [[x1, y1], [x, y]].forEach(([px, py]) => at(px, py)),
    bezierCurveTo: (x1, y1, x2, y2, x, y) => [[x1, y1], [x2, y2], [x, y]].forEach(([px, py]) => at(px, py)),
    arcTo: (x1, y1, x2, y2) => [[x1, y1], [x2, y2]].forEach(([px, py]) => at(px, py)),
    arc: (x, y, radius) => box(x - radius, y - radius, radius * 2, radius * 2),
    ellipse: (x, y, radiusX, radiusY) => box(x - radiusX, y - radiusY, radiusX * 2, radiusY * 2),
    rect: box,
    fillRect: (x, y, width, height) => {
      box(x, y, width, height);
      fills.push(state.fillStyle);
    },
    fill: () => fills.push(state.fillStyle),
    measureText: () => ({ width: 10 }),
  };
  const ctx = new Proxy(state, {
    get: (target, name) => methods[name] ?? (name in target ? target[name] : () => {}),
    set: (target, name, value) => {
      target[name] = value;
      return true;
    },
  });
  return { ctx, points, fills, reset: () => points.splice(0) };
}

export function bounds(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}
