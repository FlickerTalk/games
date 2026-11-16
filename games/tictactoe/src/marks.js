import { circle, clamp, ease, ellipse, line, paint, polygon, starPath } from "../../../kit/src/canvas/pen.js";

export function drawLegalTarget(ctx, theme, x, y, cell, { side = 0 } = {}) {
  const { ring, dot } = theme.pieces[side];
  ctx.save();
  ctx.setLineDash([cell * 0.035, cell * 0.05]);
  circle(ctx, x, y, cell * 0.22, null, ring, Math.max(2, cell * 0.025));
  ctx.setLineDash([]);
  ellipse(ctx, x, y, cell * 0.045, cell * 0.045, dot);
  ctx.restore();
}

export function drawLastMove(ctx, theme, x, y, cell) {
  const size = cell * 0.88;
  ctx.save();
  ctx.setLineDash([size * 0.055, size * 0.055]);
  circle(ctx, x, y, size * 0.43, null, theme.marks.white, Math.max(2, size * 0.025));
  ctx.setLineDash([]);
  const corner = [
    [0.31, -0.43],
    [0.43, -0.31],
    [0.31, -0.19],
    [0.19, -0.31],
  ];
  polygon(ctx, corner.map(([dx, dy]) => [x + dx * size, y + dy * size]), theme.marks.diamond, theme.ink, 1.5);
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, cell) {
  const radius = cell * 0.108;
  const [cx, cy] = [x + cell * 0.32, y - cell * 0.32];
  const width = Math.max(1.5, cell * 0.02);
  ctx.save();
  circle(ctx, cx, cy, radius, theme.marks.cream, theme.ink, width);
  line(ctx, [[cx, cy - radius * 0.56], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, width);
  ctx.restore();
}

export function drawPlacementBurst(ctx, theme, x, y, cell, progress, side) {
  const t = clamp(progress);
  if (t <= 0 || t >= 1) return;
  const colour = theme.pieces[side].hue;
  ctx.save();
  ctx.globalAlpha *= 1 - t;
  for (let spark = 0; spark < 8; spark += 1) {
    const angle = (spark * Math.PI) / 4;
    const distance = cell * (0.35 + ease(t) * 0.55);
    const [px, py] = [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance];
    if (spark % 2) {
      const outer = cell * 0.075 * (1 - t * 0.4);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      starPath(ctx, 0, 0, outer, outer * 0.48);
      paint(ctx, colour, theme.ink, Math.max(1.5, outer * 0.11));
      ctx.restore();
    } else ellipse(ctx, px, py, cell * 0.045, cell * 0.045, colour, theme.ink, 1.5);
  }
  ctx.restore();
}

export function drawMiss(ctx, theme, x, y, cell, progress) {
  const t = clamp(progress);
  if (t <= 0 || t >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - t;
  ctx.setLineDash([cell * 0.07, cell * 0.06]);
  circle(ctx, x, y, cell * (0.25 + t * 0.35), null, theme.marks.miss, Math.max(2, cell * 0.045));
  ctx.setLineDash([]);
  for (let tick = 0; tick < 4; tick += 1) {
    const angle = Math.PI / 4 + (tick * Math.PI) / 2;
    const [inner, outer] = [cell * 0.43, cell * (0.52 + t * 0.08)];
    line(ctx, [[x + Math.cos(angle) * inner, y + Math.sin(angle) * inner], [x + Math.cos(angle) * outer, y + Math.sin(angle) * outer]], theme.ink, cell * 0.035);
  }
  ctx.restore();
}

function drawNotch(ctx, theme, point, angle, width, colour) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  polygon(ctx, [[0, -width], [width * 1.7, -width * 0.65], [width * 1.15, 0], [width * 1.7, width * 0.65], [0, width]], colour, theme.ink, 2);
  ctx.restore();
}

export function drawWinRibbon(ctx, theme, from, to, width, progress, side) {
  const t = ease(progress);
  if (t <= 0) return;
  const colour = theme.pieces[side].hue;
  const end = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  ctx.save();
  line(ctx, [[from.x, from.y], [end.x, end.y]], theme.ink, width + 6);
  line(ctx, [[from.x, from.y], [end.x, end.y]], colour, width);
  if (t > 0.92) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    drawNotch(ctx, theme, from, angle + Math.PI, width, colour);
    drawNotch(ctx, theme, to, angle, width, colour);
  }
  ctx.restore();
}
