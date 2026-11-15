const IDENTITY = [1, 0, 0, 1, 0, 0];
const STYLES = ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "font", "textAlign", "textBaseline", "direction", "globalAlpha"];
const COLOURS = new Set(["fillStyle", "strokeStyle"]);

const multiply = ([a, b, c, d, e, f], [g, h, i, j, k, l]) => [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f];

export function recorder() {
  const calls = [];
  const stack = [];
  const style = {};
  let matrix = IDENTITY;
  let depth = 0;
  const apply = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  const scale = () => Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]));
  const add = (op, points = [], extra = {}) => calls.push({ op, points: points.map(([x, y]) => apply(x, y)), ...extra });
  const ctx = {
    calls,
    get depth() {
      return depth;
    },
    get matrix() {
      return matrix;
    },
    save() {
      stack.push({ matrix, style: { ...style } });
      depth += 1;
      add("save");
    },
    restore() {
      const kept = stack.pop();
      if (!kept) throw new Error("restore without save");
      matrix = kept.matrix;
      Object.assign(style, kept.style);
      depth -= 1;
      add("restore");
    },
    translate(x, y) {
      matrix = multiply(matrix, [1, 0, 0, 1, x, y]);
    },
    scale(x, y) {
      matrix = multiply(matrix, [x, 0, 0, y, 0, 0]);
    },
    rotate(angle) {
      matrix = multiply(matrix, [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]);
    },
    transform(a, b, c, d, e, f) {
      matrix = multiply(matrix, [a, b, c, d, e, f]);
    },
    setTransform(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
      matrix = [a, b, c, d, e, f];
    },
    resetTransform() {
      matrix = IDENTITY;
    },
    beginPath: () => add("beginPath"),
    closePath: () => add("closePath"),
    moveTo: (x, y) => add("moveTo", [[x, y]]),
    lineTo: (x, y) => add("lineTo", [[x, y]]),
    quadraticCurveTo: (cx, cy, x, y) => add("quadraticCurveTo", [[cx, cy], [x, y]]),
    bezierCurveTo: (ax, ay, bx, by, x, y) => add("bezierCurveTo", [[ax, ay], [bx, by], [x, y]]),
    arcTo: (ax, ay, bx, by, radius) => add("arcTo", [[ax, ay], [bx, by]], { radius: radius * scale() }),
    arc: (x, y, radius, from, to) => add("arc", [[x, y], [x - radius, y - radius], [x + radius, y + radius]], { radius: radius * scale(), from, to }),
    ellipse: (x, y, rx, ry, turn, from, to) => add("ellipse", [[x, y], [x - rx, y - ry], [x + rx, y + ry]], { rx: rx * scale(), ry: ry * scale(), turn, from, to }),
    rect: (x, y, w, h) => add("rect", [[x, y], [x + w, y + h]]),
    roundRect: (x, y, w, h) => add("roundRect", [[x, y], [x + w, y + h]]),
    fill: () => add("fill"),
    stroke: () => add("stroke"),
    clip: () => add("clip"),
    fillRect: (x, y, w, h) => add("fillRect", [[x, y], [x + w, y + h]]),
    strokeRect: (x, y, w, h) => add("strokeRect", [[x, y], [x + w, y + h]]),
    clearRect: (x, y, w, h) => add("clearRect", [[x, y], [x + w, y + h]]),
    fillText: (text, x, y) => add("fillText", [[x, y]], { text }),
    strokeText: (text, x, y) => add("strokeText", [[x, y]], { text }),
    measureText: (text) => ({ width: String(text).length * (parseFloat(/(\d+(?:\.\d+)?)px/.exec(style.font ?? "")?.[1] ?? 10) * 0.55) }),
  };
  for (const name of STYLES) {
    Object.defineProperty(ctx, name, {
      get: () => style[name],
      set: (value) => {
        style[name] = value;
        calls.push({ op: "set", name, value, points: [] });
      },
    });
  }
  return ctx;
}

const round = (value) => Math.round(value * 100) / 100 + 0;

export function shapes(ctx, { shift = [0, 0] } = {}) {
  return ctx.calls
    .filter((call) => !(call.op === "set" && COLOURS.has(call.name)))
    .map(({ op, points, ...rest }) => JSON.stringify([op, points.map(([x, y]) => [round(x - shift[0]), round(y - shift[1])]), rest]));
}

export function colours(ctx) {
  return ctx.calls.filter((call) => call.op === "set" && COLOURS.has(call.name)).map((call) => call.value);
}

export function painted(ctx) {
  return ctx.calls.flatMap((call) => call.points);
}

export function bounds(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

export function draw(paint) {
  const ctx = recorder();
  paint(ctx);
  return ctx;
}

export function contains(big, small) {
  const whole = big.join("\n");
  return whole.includes(small.join("\n"));
}
