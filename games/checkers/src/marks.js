import { TAU, circle, clamp, ease, hash, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

const PULSE = 4;

export function drawLegalTarget(ctx, theme, x, y, size, { capture = false, time = 0 } = {}) {
  const { white, cream } = theme.marks;
  const pulse = 1 + Math.sin(time * PULSE) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  circle(ctx, 0, 0, size * (capture ? 0.3 : 0.19), capture ? null : cream, white, Math.max(2, size * 0.06));
  if (capture) {
    circle(ctx, 0, 0, size * 0.19, null, white, Math.max(2, size * 0.05));
    for (let tick = 0; tick < 4; tick += 1) {
      const [dx, dy] = [Math.cos((tick * Math.PI) / 2), Math.sin((tick * Math.PI) / 2)];
      line(ctx, [[dx * size * 0.35, dy * size * 0.35], [dx * size * 0.43, dy * size * 0.43]], white, Math.max(2, size * 0.05));
    }
  }
  ctx.restore();
}

export function drawSelected(ctx, theme, x, y, size, time = 0) {
  ctx.save();
  roundedRect(ctx, x - size / 2 + 3, y - size / 2 + 3, size - 6, size - 6, size * 0.18);
  paint(ctx, null, theme.marks.white, Math.max(3, size * 0.075));
  for (let corner = 0; corner < 4; corner += 1) {
    const angle = (corner * Math.PI) / 2 + Math.PI / 4;
    const radius = size * 0.055 + Math.sin(time * PULSE) * size * 0.008;
    circle(ctx, x + Math.cos(angle) * size * 0.41, y + Math.sin(angle) * size * 0.41, radius, theme.marks.peg, theme.ink, 1.5);
  }
  ctx.restore();
}

export function drawForcedHint(ctx, theme, x, y, size, time = 0) {
  const bob = Math.sin(time * PULSE) * size * 0.04;
  ctx.save();
  ctx.translate(x, y - size * 0.44 + bob);
  polygon(ctx, [[0, -size * 0.18], [size * 0.19, size * 0.12], [-size * 0.19, size * 0.12]], theme.marks.alert, theme.ink, Math.max(1.5, size * 0.045));
  line(ctx, [[0, -size * 0.07], [0, size * 0.025]], theme.ink, Math.max(2, size * 0.05));
  circle(ctx, 0, size * 0.075, size * 0.025, theme.ink);
  ctx.restore();
}

export function drawLastMove(ctx, theme, from, to, size) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const start = [from.x + Math.cos(angle) * size * 0.28, from.y + Math.sin(angle) * size * 0.28];
  const end = [to.x - Math.cos(angle) * size * 0.3, to.y - Math.sin(angle) * size * 0.3];
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.setLineDash([size * 0.1, size * 0.1]);
  line(ctx, [start, end], theme.marks.cream, Math.max(2, size * 0.06));
  ctx.setLineDash([]);
  ctx.translate(end[0], end[1]);
  ctx.rotate(angle);
  polygon(ctx, [[size * 0.15, 0], [-size * 0.08, -size * 0.12], [-size * 0.08, size * 0.12]], theme.marks.cream);
  ctx.restore();
}

export function drawJumpArc(ctx, theme, from, to, size, progress = 1) {
  const height = Math.hypot(to.x - from.x, to.y - from.y) * 0.22;
  ctx.save();
  ctx.globalAlpha = clamp(1 - progress * 0.6);
  ctx.setLineDash([size * 0.12, size * 0.11]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 - height, to.x, to.y);
  ctx.strokeStyle = theme.marks.white;
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawCaptureBurst(ctx, theme, x, y, size, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let spark = 0; spark < 8; spark += 1) {
    const angle = (spark * TAU) / 8 + hash(spark) * 0.3;
    const distance = size * (0.15 + ease(p) * (0.45 + hash(spark + 4) * 0.2));
    const [px, py] = [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance];
    if (spark % 2) {
      starPath(ctx, px, py, size * 0.1 * (1 - p * 0.4));
      paint(ctx, theme.marks.alert, theme.ink, 1);
    } else circle(ctx, px, py, size * 0.065, theme.marks.white, theme.ink, 1);
  }
  ctx.restore();
}

export function drawCrownSparkles(ctx, theme, x, y, size, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let spark = 0; spark < 5; spark += 1) {
    const angle = -Math.PI + (spark * Math.PI) / 4;
    const distance = size * (0.4 + p * 0.35);
    starPath(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, size * 0.09);
    paint(ctx, theme.marks.crown, theme.ink, 1);
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
