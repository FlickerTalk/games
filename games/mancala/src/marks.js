import { TAU, circle, clamp, ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const unitOf = (pit) => pit.rx / 18;

export function drawLegalRing(ctx, theme, pit, side, { below = true } = {}) {
  const u = unitOf(pit);
  const colour = theme.pieces[side].body;
  const toward = below ? 1 : -1;
  const tip = pit.y + toward * (pit.ry + 3 * u);
  const base = pit.y + toward * (pit.ry + 9 * u);
  ctx.save();
  ctx.setLineDash([4 * u, 5 * u]);
  ellipse(ctx, pit.x, pit.y, pit.rx + 5 * u, pit.ry + 5 * u, null, colour, Math.max(2, 3 * u));
  ctx.setLineDash([]);
  polygon(ctx, [[pit.x - 5 * u, base], [pit.x + 5 * u, base], [pit.x, tip]], colour, theme.ink, Math.max(1, 1.5 * u));
  ctx.restore();
}

function drawRepeat(ctx, theme, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.31, -Math.PI * 0.75, Math.PI * 0.65);
  ctx.moveTo(size * 0.08, -size * 0.38);
  ctx.lineTo(size * 0.34, -size * 0.28);
  ctx.lineTo(size * 0.3, 0);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = Math.max(1.5, size * 0.13);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

export function drawLastMark(ctx, theme, pit) {
  const u = unitOf(pit);
  const [x, y] = [pit.x - pit.rx * 0.72, pit.y - pit.ry * 0.78];
  ctx.save();
  ellipse(ctx, pit.x, pit.y, pit.rx - 3 * u, pit.ry - 3 * u, null, theme.marks.cream, Math.max(1.5, 2.5 * u));
  circle(ctx, x, y, 7 * u, theme.marks.cream, theme.ink, Math.max(1, 1.5 * u));
  drawRepeat(ctx, theme, x, y, 11 * u);
  ctx.restore();
}

export function drawPendingClock(ctx, theme, pit) {
  const radius = Math.max(5, pit.rx * 0.36);
  const [x, y] = [pit.x + pit.rx * 0.72, pit.y - pit.ry * 0.72];
  ctx.save();
  circle(ctx, x, y, radius, theme.marks.white, theme.ink, 1.5);
  line(ctx, [[x, y - radius * 0.6], [x, y], [x + radius * 0.45, y + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}

export function drawCount(ctx, theme, text, x, y, size) {
  ctx.save();
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = theme.marks.cream;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawActiveRow(ctx, theme, box, side) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  roundedRect(ctx, box.x, box.y, box.w, box.h, box.h * 0.38);
  paint(ctx, null, theme.pieces[side].body, Math.max(2, box.h * 0.04));
  ctx.restore();
}

export function drawCaptureBurst(ctx, theme, pit, side, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const u = unitOf(pit);
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let ray = 0; ray < 8; ray += 1) {
    const [dx, dy] = [Math.cos((ray * TAU) / 8), Math.sin((ray * TAU) / 8)];
    const reach = 18 * u * p;
    line(ctx, [[pit.x + dx * pit.rx, pit.y + dy * pit.ry], [pit.x + dx * (pit.rx + reach), pit.y + dy * (pit.ry + reach)]], theme.pieces[side].light, Math.max(2, 4 * u));
  }
  ctx.restore();
}

export function drawStoreSparkles(ctx, theme, store, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const u = store.rx / 14;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const [x, y] = [store.x + sx * store.rx * 1.05, store.y + sy * store.ry * (0.8 + 0.3 * p)];
    starPath(ctx, x, y, ((10 + p * 6) * u) / 2);
    paint(ctx, theme.marks.star, theme.ink, Math.max(1, 1.2 * u));
  }
  ctx.restore();
}
