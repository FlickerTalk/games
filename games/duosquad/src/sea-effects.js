import { TAU, circle, clamp, ease, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

export function bubbles(ctx, x, y, size, time, count, colour) {
  for (let at = 0; at < count; at += 1) {
    const phase = (((time * 0.45 + at / count) % 1) + 1) % 1;
    const bx = x + Math.sin(at * 7.3 + time) * size * 0.25;
    circle(ctx, bx, y - phase * size, size * (0.025 + (at % 3) * 0.012), null, colour, Math.max(1, size * 0.018));
  }
}

function torpedo(ctx, look, [main, , dark], time) {
  roundedRect(ctx, -6, -18, 12, 30, 6);
  paint(ctx, main, look.ink, 2.5);
  polygon(ctx, [[-6, -12], [0, -24], [6, -12]], look.steel, look.ink, 2);
  for (const side of [-1, 1]) polygon(ctx, [[side * 6, 5], [side * 12, 14], [side * 4, 12]], dark, look.ink, 2);
  circle(ctx, Math.sin(time * 9) * 2, 20, 2.2, null, look.glass, 1.2);
  circle(ctx, -Math.sin(time * 9) * 2, 26, 1.6, null, look.glass, 1.2);
}

function sonic(ctx, look, colours, time) {
  for (let at = 0; at < 3; at += 1) {
    ctx.beginPath();
    ctx.arc(0, 12, 12 + at * 12 + ((time * 12) % 8), Math.PI * 1.12, Math.PI * 1.88);
    ctx.strokeStyle = colours[at % 2];
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  polygon(ctx, [[0, -6], [5, 2], [0, 10], [-5, 2]], look.white);
}

export function drawBolt(ctx, x, y, size, look, { seat = 0, wide = false, time = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (wide) {
    ctx.scale(size / 48, size / 48);
    sonic(ctx, look, [look.bodies[seat][0], look.bodies[1 - seat][0]], time);
  } else {
    ctx.scale(size / 38, size / 38);
    torpedo(ctx, look, look.bodies[seat], time);
  }
  ctx.restore();
}

export function drawHazard(ctx, x, y, size, look, time = 0) {
  const scale = (size / 68) * (1 + Math.sin(time * 3) * 0.06);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  circle(ctx, 0, 0, 34, look.violetDark, look.ink, 4);
  circle(ctx, 0, 0, 23, look.violet, look.cyan, 3);
  polygon(ctx, [[0, -14], [9, 0], [0, 14], [-9, 0]], look.cyan);
  for (let at = 0; at < 6; at += 1) {
    const angle = (at * TAU) / 6 + time * 0.3;
    circle(ctx, Math.cos(angle) * 44, Math.sin(angle) * 44, 3, look.cyan);
  }
  ctx.restore();
}

export function drawCaught(ctx, x, y, size, look, time = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.globalAlpha *= 0.6 + Math.sin(time * 3) * 0.2;
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -time * 10;
  ellipse(ctx, 0, 0, 53, 62, null, look.steel, 3);
  ctx.setLineDash([]);
  bubbles(ctx, 0, 40, 100, time, 6, look.glass);
  ctx.restore();
}

export function drawFreed(ctx, x, y, size, progress, look) {
  const p = clamp(progress);
  const grow = 1 + ease(p) * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.globalAlpha *= 1 - p;
  ellipse(ctx, 0, 0, 53 * grow, 62 * grow, null, look.cyan, 4);
  for (let at = 0; at < 8; at += 1) {
    const angle = (at * TAU) / 8;
    const inner = 34 + ease(p) * 40;
    line(ctx, [[Math.cos(angle) * inner, Math.sin(angle) * inner], [Math.cos(angle) * (inner + 14), Math.sin(angle) * (inner + 14)]], look.amber, 5);
  }
  for (let at = 0; at < 6; at += 1) circle(ctx, Math.sin(at * 2.1) * 40, 30 - p * 90 - at * 8, 3 + (at % 3), null, look.cyan, 2);
  ctx.restore();
}

export function drawLink(ctx, from, to, look, time = 0) {
  const path = [[from.x, from.y], [(from.x + to.x) / 2, (from.y + to.y) / 2 - 16], [to.x, to.y]];
  ctx.save();
  ctx.setLineDash([16, 8]);
  ctx.lineDashOffset = -time * 40;
  line(ctx, path, look.ink, 13);
  line(ctx, path, look.cyan, 8);
  ctx.setLineDash([]);
  circle(ctx, from.x, from.y, 8, look.bodies[0][0], look.white, 2);
  circle(ctx, to.x, to.y, 8, look.bodies[1][0], look.white, 2);
  ctx.restore();
}

export function drawOrb(ctx, x, y, size, look, time = 0) {
  const pulse = Math.sin(time * 4) * 1.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 40, size / 40);
  ctx.save();
  ctx.globalAlpha *= 0.35;
  line(ctx, [[0, 18], [0, 43]], look.cyan, 8);
  ctx.restore();
  circle(ctx, 0, 0, 18 + pulse, look.cyanDark, look.ink, 3);
  circle(ctx, 0, 0, 12 + pulse * 0.4, look.cyan, look.white, 2);
  polygon(ctx, [[0, -8], [6, 0], [0, 8], [-6, 0]], look.white);
  for (const side of [-1, 1]) line(ctx, [[side * 20, 0], [side * 25, 0]], look.cyan, 3);
  ctx.restore();
}
