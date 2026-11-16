import { TAU, circle, clamp, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { drawDisc } from "./pieces.js";

const BREATH = TAU;
const BOB = 5;
const BADGE = 220;

export function drawLegalRing(ctx, theme, x, y, radius, time = 0) {
  const { cream, coral } = theme.marks;
  const pulse = 1 + Math.sin(time * BREATH) * 0.06;
  const width = Math.max(2, radius * 0.1);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  circle(ctx, 0, 0, radius * 0.58, cream, theme.ink, width);
  circle(ctx, 0, 0, radius * 0.19, coral);
  for (let tick = 0; tick < 4; tick += 1) {
    const [dx, dy] = [Math.cos((tick * Math.PI) / 2), Math.sin((tick * Math.PI) / 2)];
    line(ctx, [[dx * radius * 0.72, dy * radius * 0.72], [dx * radius * 0.88, dy * radius * 0.88]], cream, width);
  }
  ctx.restore();
}

export function drawLastMarker(ctx, theme, x, y, radius) {
  const size = radius * 0.52;
  ctx.save();
  circle(ctx, x, y, radius * 0.9, null, theme.marks.glow, Math.max(2, radius * 0.09));
  ctx.translate(x + radius * 0.67, y - radius * 0.67);
  ctx.rotate(0.2);
  starPath(ctx, 0, 0, size / 2);
  paint(ctx, theme.marks.star, theme.ink, Math.max(1.2, size * 0.1));
  ctx.restore();
}

export function drawFlipSpark(ctx, theme, x, y, radius, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - p;
  for (let spark = 0; spark < 4; spark += 1) {
    const angle = Math.PI / 4 + (spark * Math.PI) / 2;
    const inner = radius * (0.7 + p * 0.5);
    const outer = inner + radius * 0.3;
    line(ctx, [[x + Math.cos(angle) * inner, y + Math.sin(angle) * inner], [x + Math.cos(angle) * outer, y + Math.sin(angle) * outer]], theme.marks.glow, Math.max(2, radius * 0.1));
  }
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, size) {
  const radius = Math.max(5, size * 0.14);
  const [cx, cy] = [x + size / 2 - radius - 2, y - size / 2 + radius + 2];
  ctx.save();
  circle(ctx, cx, cy, radius, theme.marks.white, theme.ink, 1.5);
  line(ctx, [[cx, cy - radius * 0.6], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}

function drawTurnArrow(ctx, colour, size) {
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.33, -Math.PI * 0.8, Math.PI * 0.65);
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = "round";
  ctx.stroke();
  polygon(ctx, [[size * 0.36, -size * 0.28], [size * 0.43, size * 0.12], [size * 0.08, size * 0.02]], colour);
}

function drawClock(ctx, ui, size) {
  circle(ctx, 0, 0, size * 0.42, ui.surface, ui.text, size * 0.08);
  line(ctx, [[0, -size * 0.24], [0, 0], [size * 0.22, size * 0.12]], ui.text, size * 0.08);
}

export function drawPassBadge(ctx, theme, x, y, width, side, { time = 0, alpha = 1 } = {}) {
  if (alpha <= 0) return;
  const { ui } = theme;
  const unit = width / BADGE;
  const height = 56 * unit;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  roundedRect(ctx, x - width / 2, y - height / 2, width, height, Math.min(16, height / 2));
  paint(ctx, ui.surface, ui.border, Math.max(1, unit * 1.5));
  drawDisc(ctx, theme, x - width * 0.3, y, 17 * unit, { side });
  drawDisc(ctx, theme, x + width * 0.3, y, 17 * unit, { side });
  ctx.save();
  ctx.translate(x + width * 0.3, y);
  drawClock(ctx, ui, 24 * unit);
  ctx.restore();
  ctx.translate(x, y + Math.sin(time * BOB) * 3 * unit);
  drawTurnArrow(ctx, ui.text, 40 * unit);
  ctx.restore();
}
