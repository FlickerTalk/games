import { TAU, circle, line, polygon } from "../../../kit/src/canvas/pen.js";

const PULSE_HZ = 0.7;

const pulse = (time) => (Math.sin(time * TAU * PULSE_HZ) + 1) / 2;
const clamp = (value) => Math.min(1, Math.max(0, value));

function arrowHead(ctx, tip, angle, length, colour) {
  const back = [tip[0] - Math.cos(angle) * length, tip[1] - Math.sin(angle) * length];
  const side = [Math.cos(angle + Math.PI / 2) * length * 0.55, Math.sin(angle + Math.PI / 2) * length * 0.55];
  polygon(ctx, [tip, [back[0] + side[0], back[1] + side[1]], [back[0] - side[0], back[1] - side[1]]], colour);
}

export function drawTarget(ctx, theme, x, y, r, { hit = false, time = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha *= 0.78 + pulse(time) * 0.18;
  if (hit) circle(ctx, x, y, r * 1.22, null, theme.marks.line, Math.max(1.5, r * 0.14));
  circle(ctx, x, y, Math.max(3.5, r * 0.34), theme.marks.dot, theme.ink, Math.max(1, r * 0.08));
  ctx.restore();
}

export function drawOffTarget(ctx, theme, x, y, r, time = 0) {
  const width = Math.max(2, r * 0.18);
  ctx.save();
  ctx.globalAlpha *= 0.78 + pulse(time) * 0.18;
  line(ctx, [[x - r * 0.7, y], [x + r * 0.2, y]], theme.marks.dot, width);
  arrowHead(ctx, [x + r * 0.75, y], 0, r * 0.6, theme.marks.dot);
  ctx.restore();
}

export function drawSourceDot(ctx, theme, x, y, r, time = 0) {
  circle(ctx, x, y, r * (0.2 + 0.04 * pulse(time)), theme.marks.dot, theme.ink, Math.max(1, r * 0.08));
}

export function drawSelection(ctx, theme, x, y, r, time = 0) {
  const ring = r + Math.max(2, r * 0.22) + pulse(time) * Math.max(1, r * 0.1);
  circle(ctx, x, y, ring, null, theme.marks.ring, Math.max(2, r * 0.16));
  circle(ctx, x, y, ring + Math.max(1.5, r * 0.12), null, theme.ink, Math.max(1, r * 0.06));
}

export function drawLastMove(ctx, theme, from, to, r) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const stop = Math.max(0, length - r * 0.6);
  const tip = [from.x + Math.cos(angle) * stop, from.y + Math.sin(angle) * stop];
  const head = Math.max(4, r * 0.55);
  ctx.save();
  ctx.globalAlpha *= 0.72;
  circle(ctx, from.x, from.y, Math.max(2, r * 0.25), theme.marks.line);
  if (stop > head) {
    line(ctx, [[from.x, from.y], [tip[0] - Math.cos(angle) * head * 0.8, tip[1] - Math.sin(angle) * head * 0.8]], theme.marks.line, Math.max(1.5, r * 0.16));
    arrowHead(ctx, tip, angle, head, theme.marks.line);
  }
  ctx.restore();
}

export function drawHitRing(ctx, theme, x, y, r, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - p;
  circle(ctx, x, y, r * (2 - p), null, theme.marks.line, Math.max(1.5, r * 0.14));
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, r) {
  const radius = Math.max(4, r * 0.45);
  const [cx, cy] = [x + r * 0.8, y - r * 0.8];
  circle(ctx, cx, cy, radius, theme.marks.clock, theme.ink, 1.5);
  line(ctx, [[cx, cy - radius * 0.6], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, 1.5);
}
