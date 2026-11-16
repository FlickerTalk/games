import { circle, clamp, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

function braid(ctx, look, size, seat, time) {
  const [width, height] = [size * 1.1, size * 1.5];
  [look.bodies[seat][0], look.bodies[1 - seat][0]].forEach((colour, strand) => {
    const points = Array.from({ length: 9 }, (_, at) => [Math.sin((at / 8) * Math.PI * 2 - time * 4 + strand * Math.PI) * width * 0.2, height * (0.5 - at / 8)]);
    line(ctx, points, look.ink, width * 0.32);
    line(ctx, points, colour, width * 0.22);
    ctx.save();
    ctx.globalAlpha *= 0.7;
    line(ctx, points, look.white, width * 0.05);
    ctx.restore();
  });
  circle(ctx, 0, -height / 2, width * 0.18, look.energy);
}

export function drawBolt(ctx, x, y, size, look, { seat = 0, wide = false, time = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (wide) braid(ctx, look, size, seat, time);
  else {
    roundedRect(ctx, -size * 0.18, -size * 0.5, size * 0.36, size, size * 0.18);
    paint(ctx, look.bodies[seat][0], look.white, 1.2);
    line(ctx, [[0, -size * 0.32], [0, size * 0.25]], look.white, Math.max(1.5, size * 0.09));
  }
  ctx.restore();
}

export function drawHazard(ctx, x, y, size, look, time = 0) {
  ctx.save();
  ctx.translate(x, y);
  circle(ctx, 0, 0, size * 0.5, look.enemyDark, look.ink, 3);
  circle(ctx, 0, 0, size * 0.37, look.shot, look.enemyLight, 2);
  ctx.rotate(time * 1.8);
  for (let at = 0; at < 4; at += 1) {
    const [dx, dy] = [Math.cos((at * Math.PI) / 2), Math.sin((at * Math.PI) / 2)];
    line(ctx, [[dx * size * 0.12, dy * size * 0.12], [dx * size * 0.31, dy * size * 0.31]], look.shotLight, 2);
  }
  circle(ctx, 0, 0, size * 0.1, look.white);
  ctx.restore();
}

export function drawCaught(ctx, x, y, size, look, time = 0) {
  ctx.save();
  ctx.globalAlpha = 0.3 + Math.max(0, Math.sin(time * 13)) * 0.35;
  ctx.strokeStyle = look.shield;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10, 4, 10]);
  ctx.lineDashOffset = -time * 7;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
  ctx.stroke();
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
  ctx.arc(x, y, size * (0.25 + p * 0.35), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let at = 0; at < 6; at += 1) {
    const [dx, dy] = [Math.cos((at * Math.PI) / 3), Math.sin((at * Math.PI) / 3)];
    const inner = size * (0.18 + p * 0.35);
    line(ctx, [[x + dx * inner, y + dy * inner], [x + dx * (inner + 9), y + dy * (inner + 9)]], look.white, 3);
  }
  ctx.restore();
}

export function drawLink(ctx, from, to, look, time = 0) {
  const [midX, midY] = [(from.x + to.x) / 2, (from.y + to.y) / 2 - 7];
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(time * 3) * 0.12;
  line(ctx, [[from.x, from.y], [midX, midY]], look.bodies[0][0], 4);
  line(ctx, [[midX, midY], [to.x, to.y]], look.bodies[1][0], 4);
  circle(ctx, midX, midY, 4, look.white);
  ctx.restore();
}

export function drawOrb(ctx, x, y, size, look, time = 0) {
  const radius = size / 2;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 2.2) * size * 0.06);
  ctx.rotate(time * 0.35);
  circle(ctx, 0, 0, radius, look.bodies[1][2], look.ink, Math.max(1.5, size * 0.08));
  circle(ctx, 0, 0, radius * 0.7, look.energy, look.bodies[1][1], Math.max(1.5, size * 0.06));
  circle(ctx, -radius * 0.18, -radius * 0.2, radius * 0.24, look.white);
  ctx.strokeStyle = look.bodies[1][0];
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  ctx.setLineDash([radius * 0.8, radius * 0.45]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
