import { drawDigits, formatNumber } from "../../../kit/src/canvas/bar.js";
import { TAU, circle, clamp, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

const INSET = 8;
const PARTS = 10;

export function drawRuler(ctx, ruler, { range = 10, ticks = false, lang = "en" }, theme) {
  const { x, y, w, h } = ruler;
  const { wood, edge, mark } = theme.art.ruler;
  const band = Math.min(11, h * 0.14);
  ctx.save();
  roundedRect(ctx, x, y, w, h, Math.min(15, h * 0.22));
  paint(ctx, wood, theme.art.ink, theme.stroke.bold);
  ctx.fillStyle = edge;
  ctx.fillRect(x + 3, y + h - 4 - band, w - 6, band);
  for (let part = 0; part <= PARTS; part += 1) {
    const major = part % (PARTS / 2) === 0;
    if (!ticks && !major) continue;
    const at = x + INSET + ((w - 2 * INSET) * part) / PARTS;
    line(ctx, [[at, y + 3], [at, y + h * (major ? 0.36 : 0.25)]], mark, major ? 3 : 2);
  }
  const size = clamp(h * 0.32, 20, 25);
  const baseline = y + h - 4 - band - size * 0.55;
  drawDigits(ctx, "0", x + 10, baseline, size, mark, "left");
  drawDigits(ctx, formatNumber(range, lang), x + w - 10, baseline, size, mark, "right");
  ctx.restore();
}

export function drawGuessMarker(ctx, x, y, size, who, theme) {
  const { art } = theme;
  const half = size / 2;
  if (who === "rival") polygon(ctx, [[x, y - half], [x + half, y], [x, y + half], [x - half, y]], art.marker.rival, art.ink, theme.stroke.thin);
  else circle(ctx, x, y, half, art.marker.mine, art.ink, theme.stroke.thin);
}

export function drawTruePlace(ctx, x, y, size, progress, theme) {
  const { art } = theme;
  const pulse = 1 + Math.sin(clamp(progress) * Math.PI) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  circle(ctx, 0, 0, size * 0.48, art.marker.glow, art.ink, 2.5);
  starPath(ctx, 0, 0, size * 0.28);
  paint(ctx, art.marker.star, art.ink, 1.5);
  ctx.restore();
}

const THREADS = { 3: "short", 2: "medium", 1: "long" };

export function drawThread(ctx, fromX, toX, y, { stars = 1, progress = 1 }, theme) {
  const end = fromX + (toX - fromX) * clamp(progress);
  const distance = Math.abs(toX - fromX);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fromX, y);
  ctx.quadraticCurveTo((fromX + end) / 2, y - Math.min(30, distance * 0.3 + 6), end, y);
  ctx.strokeStyle = theme.art.thread[THREADS[stars] ?? "long"];
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawRipple(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.beginPath();
  ctx.arc(x, y, size * (0.2 + p * 0.8), 0, TAU);
  ctx.strokeStyle = theme.art.white;
  ctx.lineWidth = 5 * (1 - p) + 1;
  ctx.stroke();
  ctx.restore();
}

export function drawAim(ctx, x, top, bottom, theme) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.strokeStyle = theme.art.white;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.setLineDash([2, 9]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawGhost(ctx, x, y, size, theme) {
  const { art } = theme;
  const half = size / 2;
  ctx.save();
  ctx.globalAlpha = 0.75;
  polygon(ctx, [[x, y - half], [x + half, y], [x, y + half], [x - half, y]], art.marker.ghost, art.marker.ghostEdge, 2.5);
  circle(ctx, x, y, size * 0.14, art.marker.ghostEdge);
  ctx.restore();
}
