import { circle, clamp, line, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

const spark = (x, y, size) => [
  [x, y - size],
  [x + size * 0.24, y - size * 0.24],
  [x + size, y],
  [x + size * 0.24, y + size * 0.24],
  [x, y + size],
  [x - size * 0.24, y + size * 0.24],
  [x - size, y],
  [x - size * 0.24, y - size * 0.24],
];

export function drawDropArrow(ctx, theme, x, tip, cell, { chosen = false, bob = 0 } = {}) {
  const half = cell * (chosen ? 0.2 : 0.1);
  const y = tip + bob;
  ctx.save();
  polygon(ctx, [[x - half, y - cell * 0.22], [x + half, y - cell * 0.22], [x, y]], chosen ? theme.ui.accent : theme.ui.muted);
  ctx.restore();
}

export function drawColumnBracket(ctx, theme, box, cell, time = 0) {
  ctx.save();
  roundedRect(ctx, box.x + 2, box.y, box.w - 4, box.h, cell * 0.22);
  ctx.setLineDash([cell * 0.15, cell * 0.12]);
  ctx.lineDashOffset = -time * 12;
  ctx.strokeStyle = theme.ui.accent;
  ctx.lineWidth = Math.max(2, cell * 0.06);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawLastMove(ctx, theme, x, y, radius) {
  ctx.save();
  ctx.setLineDash([radius * 0.24, radius * 0.18]);
  circle(ctx, x, y, radius * 1.16, null, theme.ink, Math.max(2, radius * 0.055));
  ctx.setLineDash([]);
  polygon(ctx, spark(x + radius * 0.82, y - radius * 0.82, radius * 0.2), theme.marks.white);
  ctx.restore();
}

export function drawLandingBurst(ctx, theme, x, y, radius, progress, side) {
  const t = clamp(progress);
  if (t <= 0 || t >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  for (let ray = 0; ray < 7; ray += 1) {
    const angle = -Math.PI * 0.9 + ray * Math.PI * 0.3;
    const inner = radius * (1 + t * 0.7);
    const outer = inner + radius * 0.34 * (1 - t * 0.4);
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    line(ctx, [[x + dx * inner, y + dy * inner], [x + dx * outer, y + dy * outer]], theme.pieces[side].deep, Math.max(2, radius * 0.09));
  }
  ctx.restore();
}

export function drawWinningLine(ctx, theme, fours, cell, glow = 0) {
  ctx.save();
  ctx.globalAlpha = 0.5 + clamp(glow, -1, 1) * 0.18;
  ctx.beginPath();
  for (const [from, to] of fours) {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.strokeStyle = theme.marks.white;
  ctx.lineWidth = Math.max(3, cell * 0.14);
  ctx.lineCap = "round";
  ctx.stroke();
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
