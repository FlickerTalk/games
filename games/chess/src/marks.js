import { TAU, circle, clamp, ease, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

const width = (size, share, least) => Math.max(least, size * share);

export function drawSelection(ctx, theme, x, y, size) {
  roundedRect(ctx, x - size * 0.45, y - size * 0.45, size * 0.9, size * 0.9, size * 0.12);
  paint(ctx, null, theme.ink, width(size, 0.065, 2));
  roundedRect(ctx, x - size * 0.39, y - size * 0.39, size * 0.78, size * 0.78, size * 0.09);
  paint(ctx, null, theme.marks.chosen, width(size, 0.04, 1.5));
}

export function drawLegalDot(ctx, theme, x, y, size) {
  circle(ctx, x, y, size * 0.095, theme.marks.dot, theme.ink, width(size, 0.025, 1.2));
}

function ring(ctx, colour, x, y, radius, thickness) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.strokeStyle = colour;
  ctx.lineWidth = thickness;
  ctx.stroke();
}

export function drawCaptureTarget(ctx, theme, x, y, size) {
  ring(ctx, theme.marks.take, x, y, size * 0.37, width(size, 0.055, 2));
  for (let tick = 0; tick < 4; tick += 1) {
    const [dx, dy] = [Math.cos((tick * Math.PI) / 2), Math.sin((tick * Math.PI) / 2)];
    line(ctx, [[x + dx * size * 0.32, y + dy * size * 0.32], [x + dx * size * 0.42, y + dy * size * 0.42]], theme.ink, width(size, 0.035, 1.5));
  }
}

export function drawLastMove(ctx, theme, x, y, size, { pending = false } = {}) {
  const colour = pending ? theme.marks.waiting : theme.marks.chosen;
  const [reach, arm] = [size * 0.39, size * 0.16];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const [cx, cy] = [x + sx * reach, y + sy * reach];
    const corner = [[cx - sx * arm, cy], [cx, cy], [cx, cy - sy * arm]];
    line(ctx, corner, theme.ink, width(size, 0.065, 3));
    line(ctx, corner, colour, width(size, 0.03, 1.5));
  }
}

export function drawCheck(ctx, theme, x, y, size) {
  ring(ctx, theme.marks.take, x, y, size * 0.43, width(size, 0.055, 2));
  line(ctx, [[x - size * 0.49, y], [x - size * 0.4, y]], theme.ink, width(size, 0.04, 2));
  line(ctx, [[x + size * 0.4, y], [x + size * 0.49, y]], theme.ink, width(size, 0.04, 2));
}

export function drawCaptureRing(ctx, theme, x, y, size, progress) {
  if (!(progress > 0 && progress < 1)) return;
  ctx.save();
  ctx.globalAlpha *= 1 - progress;
  ring(ctx, theme.marks.take, x, y, size * (0.4 - ease(progress) * 0.22), width(size, 0.045, 1.5));
  ctx.restore();
}

export function drawCastlePath(ctx, theme, from, to, size, progress) {
  if (!(progress < 1)) return;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = size * 0.16;
  const thickness = width(size, 0.055, 1.5);
  ctx.save();
  ctx.globalAlpha *= 0.85 * (1 - clamp(progress));
  line(ctx, [[from.x, from.y], [to.x, to.y]], theme.marks.dot, thickness);
  line(ctx, [[to.x - Math.cos(angle - 0.65) * head, to.y - Math.sin(angle - 0.65) * head], [to.x, to.y], [to.x - Math.cos(angle + 0.65) * head, to.y - Math.sin(angle + 0.65) * head]], theme.marks.dot, thickness);
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, size) {
  const radius = Math.max(5, size * 0.14);
  const [cx, cy] = [x + size / 2 - radius - 2, y - size / 2 + radius + 2];
  circle(ctx, cx, cy, radius, theme.marks.clock, theme.ink, 1.5);
  line(ctx, [[cx, cy - radius * 0.6], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, 1.5);
}
