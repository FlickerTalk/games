import { circle, clamp, ease, line, polygon } from "../../../kit/src/canvas/pen.js";
import { strokeOf } from "./pieces.js";

export function drawOpenLine(ctx, theme, x, y, length, { horizontal = true, open = false } = {}) {
  const thickness = strokeOf(length);
  ctx.save();
  ctx.translate(x, y);
  if (!horizontal) ctx.rotate(Math.PI / 2);
  ctx.setLineDash([length * 0.07, length * 0.055]);
  line(ctx, [[-length * 0.4, 0], [length * 0.4, 0]], open ? theme.board.open : theme.board.track, thickness * 0.62);
  ctx.setLineDash([]);
  circle(ctx, 0, 0, thickness * 0.42, theme.board.paper, open ? theme.ink : theme.board.open, Math.max(1.5, thickness * 0.16));
  ctx.restore();
}

export function drawLastLine(ctx, theme, x, y, length) {
  const thickness = strokeOf(length);
  const radius = thickness * 1.9;
  ctx.save();
  circle(ctx, x, y, radius, null, theme.marks.white, thickness * 0.28);
  circle(ctx, x, y, radius + thickness * 0.35, null, theme.ink, thickness * 0.12);
  ctx.restore();
}

export function drawClaimBurst(ctx, theme, x, y, size, side, progress) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const inner = size * (0.25 + p * 0.15);
  const outer = size * (0.38 + p * 0.25);
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let ray = 0; ray < 8; ray += 1) {
    const [dx, dy] = [Math.cos((ray * Math.PI) / 4), Math.sin((ray * Math.PI) / 4)];
    line(ctx, [[x + dx * inner, y + dy * inner], [x + dx * outer, y + dy * outer]], theme.pieces[side].deep, size * 0.035);
  }
  ctx.restore();
}

function arrowHead(angle, radius, head) {
  const [nx, ny] = [Math.cos(angle), Math.sin(angle)];
  const [px, py] = [nx * radius, ny * radius];
  const [dx, dy] = [-ny, nx];
  return [[px + dx * head, py + dy * head], [px + nx * head * 0.75, py + ny * head * 0.75], [px - nx * head * 0.75, py - ny * head * 0.75]];
}

export function drawExtraTurn(ctx, theme, x, y, size, side, progress = 1) {
  const scale = ease(progress);
  if (scale <= 0) return;
  const [from, to] = [Math.PI * 0.75, Math.PI * 2.25];
  const radius = size * 0.35;
  const deep = theme.pieces[side].deep;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  for (const [colour, width] of [[theme.ink, size * 0.075], [deep, size * 0.045]]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, from, to);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  polygon(ctx, arrowHead(to, radius, size * 0.1), deep, theme.ink, Math.max(1, size * 0.02));
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, radius) {
  ctx.save();
  circle(ctx, x, y, radius, theme.marks.white, theme.ink, 1.5);
  line(ctx, [[x, y - radius * 0.6], [x, y], [x + radius * 0.45, y + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}
