import { TAU, circle, clamp, ease, hash, line, paint, polygon, starPath } from "../../../kit/src/canvas/pen.js";

export function drawTrace(ctx, theme, points, side, cell, alpha = 1) {
  if (!points.length) return;
  const colour = theme.sides[side].body;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (points.length > 1) {
    line(ctx, points, theme.ink, cell * 0.26);
    line(ctx, points, colour, cell * 0.16);
  }
  for (const [x, y] of points) circle(ctx, x, y, cell * 0.08, colour);
  ctx.restore();
}

export function drawLastWord(ctx, theme, points, cell) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([cell * 0.07, cell * 0.07]);
  line(ctx, points, theme.ink, Math.max(1.5, cell * 0.045));
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSpark(ctx, theme, side, x, y, size) {
  const { body, mark } = theme.sides[side];
  if (mark === "star") {
    starPath(ctx, x, y, size);
    paint(ctx, body, theme.ink, 1);
  } else polygon(ctx, [[x, y - size], [x + size, y], [x, y + size], [x - size, y]], body, theme.ink, 1);
}

export function drawWordBurst(ctx, theme, x, y, cell, progress, side) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - p * p;
  for (let spark = 0; spark < 8; spark += 1) {
    const angle = (spark * TAU) / 8 + hash(spark) * 0.3;
    const distance = cell * (0.2 + ease(p) * 0.55);
    const [px, py] = [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance];
    if (spark % 2) drawSpark(ctx, theme, side, px, py, cell * 0.1 * (1 - p * 0.4));
    else circle(ctx, px, py, cell * 0.06, theme.marks.spark);
  }
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, cell) {
  const radius = Math.max(5, cell * 0.14);
  const [cx, cy] = [x + cell / 2 - radius - 2, y - cell / 2 + radius + 2];
  ctx.save();
  circle(ctx, cx, cy, radius, theme.marks.white, theme.ink, 1.5);
  line(ctx, [[cx, cy - radius * 0.6], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}
