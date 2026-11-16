import { circle, clamp, ease, ellipse, line, paint, roundedRect } from "../../../../../kit/src/canvas/pen.js";

export function drawBolt(ctx, x, y, size, look, { seat = 0, wide = false, time = 0 } = {}) {
  const colour = look.bodies[seat][0];
  ctx.save();
  ctx.translate(x, y);
  if (wide) {
    const other = look.bodies[1 - seat][0];
    [-1, 1].forEach((side, at) => {
      const sway = Math.sin(time * 9 + at * Math.PI) * size * 0.12;
      roundedRect(ctx, side * size * 0.3 + sway - size * 0.13, -size * 0.6, size * 0.26, size * 1.2, size * 0.13);
      paint(ctx, at ? other : colour, look.white, 1.2);
    });
    circle(ctx, 0, -size * 0.1, size * 0.16, look.energy);
  } else {
    roundedRect(ctx, -size * 0.18, -size * 0.5, size * 0.36, size, size * 0.18);
    paint(ctx, colour, look.white, 1.2);
    line(ctx, [[0, -size * 0.32], [0, size * 0.25]], look.white, Math.max(1.5, size * 0.09));
  }
  ctx.restore();
}

export function drawHazard(ctx, x, y, size, look, time = 0) {
  const pulse = 1 + Math.sin(time * 3) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  circle(ctx, 0, 0, size * 0.5, look.enemyDark, look.ink, 3);
  circle(ctx, 0, 0, size * 0.37, look.shot, look.enemyLight, 2);
  circle(ctx, -size * 0.1, -size * 0.12, size * 0.12, look.shotLight);
  ctx.restore();
}

export function drawCaught(ctx, x, y, size, look, time = 0) {
  const radius = size * 0.7;
  ctx.save();
  ctx.globalAlpha = 0.45 + Math.sin(time * 4) * 0.18;
  ctx.strokeStyle = look.shield;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 9, 5, 9]);
  ctx.lineDashOffset = -time * 8;
  ctx.beginPath();
  ctx.arc(x, y, radius + Math.sin(time * 2) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let at = 0; at < 3; at += 1) {
    const angle = time * 0.5 + (at * Math.PI * 2) / 3;
    circle(ctx, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 3, look.shield);
  }
  ctx.restore();
}

export function drawFreed(ctx, x, y, size, progress, look) {
  const p = clamp(progress);
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.strokeStyle = look.shield;
  ctx.lineWidth = 4 * (1 - p * 0.5);
  ctx.setLineDash([14, 8]);
  ctx.beginPath();
  ctx.arc(x, y, size * (0.4 + ease(p) * 0.6), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let at = 0; at < 6; at += 1) {
    const angle = (at * Math.PI) / 3;
    const inner = size * (0.3 + ease(p) * 0.6);
    line(ctx, [[x + Math.cos(angle) * inner, y + Math.sin(angle) * inner], [x + Math.cos(angle) * (inner + 9), y + Math.sin(angle) * (inner + 9)]], look.white, 3);
  }
  ctx.restore();
}

export function drawLink(ctx, from, to, look, time = 0) {
  const [midX, midY] = [(from.x + to.x) / 2, (from.y + to.y) / 2 - 9];
  ctx.save();
  ctx.globalAlpha = 0.6 + Math.sin(time * 3) * 0.12;
  line(ctx, [[from.x, from.y], [midX, midY]], look.bodies[0][0], 5);
  line(ctx, [[midX, midY], [to.x, to.y]], look.bodies[1][0], 5);
  line(ctx, [[from.x, from.y], [midX, midY], [to.x, to.y]], look.white, 1.5);
  for (let at = 0; at < 3; at += 1) {
    const p = (time * 0.8 + at / 3) % 1;
    circle(ctx, from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * 9, 3, look.energy);
  }
  ctx.restore();
}

export function drawOrb(ctx, x, y, size, look, time = 0) {
  const radius = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 0.35);
  circle(ctx, 0, 0, radius, look.bodies[1][2], look.ink, Math.max(1.5, size * 0.08));
  circle(ctx, 0, 0, radius * 0.7, look.energy, look.bodies[1][1], Math.max(1.5, size * 0.06));
  ellipse(ctx, -radius * 0.18, -radius * 0.2, radius * 0.24, radius * 0.24, look.white);
  ctx.strokeStyle = look.bodies[1][0];
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  ctx.setLineDash([radius * 0.8, radius * 0.45]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
