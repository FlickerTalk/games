export const TAU = Math.PI * 2;

export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));

export const ease = (value) => 1 - (1 - clamp(value)) ** 3;

export const wave = (turns) => Math.sin(turns * TAU);

export const mix = (from, to, amount) => from + (to - from) * amount;

export function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(Math.abs(width) / 2, Math.abs(height) / 2, radius));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

const RIMS = new WeakMap();
const RIM = 3;

export function withRim(ctx, { ink, colour }, draw) {
  if (!colour) return draw();
  const before = RIMS.get(ctx);
  RIMS.set(ctx, { ink, colour });
  try {
    return draw();
  } finally {
    if (before) RIMS.set(ctx, before);
    else RIMS.delete(ctx);
  }
}

export function paint(ctx, fill, stroke, width) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  const rim = RIMS.get(ctx);
  if (rim && stroke === rim.ink && width > 0) {
    ctx.strokeStyle = rim.colour;
    ctx.lineWidth = width + RIM;
    ctx.stroke();
  }
  if (stroke && width > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

export function circle(ctx, x, y, radius, fill, stroke = null, width = 0) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius), 0, TAU);
  paint(ctx, fill, stroke, width);
}

export function ellipse(ctx, x, y, rx, ry, fill, stroke = null, width = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU);
  paint(ctx, fill, stroke, width);
}

export function polygon(ctx, points, fill, stroke = null, width = 0) {
  ctx.beginPath();
  points.forEach(([x, y], at) => (at ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  paint(ctx, fill, stroke, width);
}

export function line(ctx, points, colour, width) {
  ctx.beginPath();
  points.forEach(([x, y], at) => (at ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function starPath(ctx, x, y, outer, inner = outer * 0.46) {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 ? inner : outer;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (point) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function fadeEdges(ctx, width, height, colour) {
  const step = Math.max(20, Math.min(38, height * 0.055)) / 3;
  ctx.save();
  ctx.fillStyle = colour;
  [1, 0.72, 0.36].forEach((alpha, at) => {
    if (at) ctx.globalAlpha = alpha;
    ctx.fillRect(0, at * step, width, step);
    ctx.fillRect(0, height - (at + 1) * step, width, step);
  });
  ctx.restore();
}

export function hash(value) {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
