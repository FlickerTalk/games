import { TAU, circle, clamp, line, paint, polygon } from "../../../kit/src/canvas/pen.js";

const breath = (time, perSecond = 1) => (Math.sin(time * TAU * perSecond) + 1) / 2;

function sparklePath(ctx, x, y, outer, inner) {
  ctx.beginPath();
  for (let point = 0; point < 8; point += 1) {
    const radius = point % 2 ? inner : outer;
    const angle = Math.PI / 4 + (point * Math.PI) / 4;
    const [px, py] = [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
    if (point) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function drawLastMove(ctx, theme, x, y, r) {
  const colour = theme.marks.last;
  ctx.save();
  ctx.translate(x, y);
  ctx.setLineDash([Math.max(3, r * 0.38), Math.max(2, r * 0.26)]);
  circle(ctx, 0, 0, r * 1.35, null, colour, Math.max(2, r * 0.18));
  ctx.setLineDash([]);
  polygon(ctx, [[0, -r * 1.75], [r * 0.28, -r * 1.35], [-r * 0.28, -r * 1.35]], colour, theme.ink, 1.5);
  ctx.restore();
}

export function drawTarget(ctx, theme, x, y, r, time = 0) {
  ctx.save();
  ctx.setLineDash([r * 0.55, r * 0.45]);
  circle(ctx, x, y, r * (1.35 + breath(time) * 0.12), null, theme.marks.target, Math.max(2, r * 0.3));
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawPlacementPop(ctx, theme, x, y, r, progress) {
  if (!(progress >= 0 && progress < 1)) return;
  const p = progress;
  ctx.save();
  ctx.globalAlpha *= 1 - p;
  circle(ctx, x, y, r * (1 + p * 2.2), null, theme.marks.gold, r * 0.45 * (1 - p) + 1);
  for (let spark = 0; spark < 4; spark += 1) {
    const angle = Math.PI / 4 + (spark * Math.PI) / 2;
    const distance = r * (1.4 + p * 1.7);
    sparklePath(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, r * 0.7 * (1 - p * 0.5), r * 0.28);
    paint(ctx, theme.marks.spark, theme.ink, 1);
  }
  ctx.restore();
}

export function drawMiss(ctx, theme, x, y, r, progress) {
  if (!(progress >= 0 && progress < 1)) return;
  const p = progress;
  const width = Math.max(2, r * 0.3);
  const colour = theme.marks.miss;
  ctx.save();
  ctx.globalAlpha *= 1 - p;
  ctx.translate(x + Math.sin(p * Math.PI * 3) * r * 0.3, y);
  circle(ctx, 0, 0, r * (1.2 + p), null, colour, width);
  line(ctx, [[-r * 0.55, -r * 0.55], [r * 0.55, r * 0.55]], colour, width);
  line(ctx, [[r * 0.55, -r * 0.55], [-r * 0.55, r * 0.55]], colour, width);
  ctx.restore();
}

export function drawWinningLine(ctx, theme, points, { progress = 1, time = 0, width, top = -Infinity }) {
  if (points.length < 2) return;
  const amount = clamp(progress);
  const [start, end] = [points[0], points.at(-1)];
  const tip = [start.x + (end.x - start.x) * amount, start.y + (end.y - start.y) * amount];
  const bob = breath(time, 1.2) * width * 0.3;
  ctx.save();
  line(ctx, [[start.x, start.y], tip], theme.ink, width);
  line(ctx, [[start.x, start.y], tip], theme.marks.gold, width * 0.5);
  for (const { x, y } of [start, end]) {
    sparklePath(ctx, x, Math.max(top + width, y - width * 1.8 - bob), width * 0.8, width * 0.35);
    paint(ctx, theme.marks.white, theme.ink, 1.5);
  }
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, size) {
  const radius = Math.max(4, size * 0.18);
  const [cx, cy] = [x + size / 2 - radius - 1, y - size / 2 + radius + 1];
  ctx.save();
  circle(ctx, cx, cy, radius, theme.marks.white, theme.ink, 1.5);
  line(ctx, [[cx, cy - radius * 0.6], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}
