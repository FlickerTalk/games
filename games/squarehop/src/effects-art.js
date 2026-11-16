import { circle, clamp, ellipse, hash, line, paint, starPath } from "../../../kit/src/canvas/pen.js";

const PIECES = 42;

export function drawConfetti(ctx, area, progress, seed, theme) {
  const p = clamp(progress);
  const colours = theme.art.confetti;
  ctx.save();
  for (let at = 0; at < PIECES; at += 1) {
    const size = 5 + hash(at + 12) * 7;
    ctx.save();
    ctx.translate(area.x + hash(at + seed) * area.w, area.y - 20 + p * (area.h + 40) + hash(at + 91 + seed) * area.h * 0.35);
    ctx.rotate(p * 8 + hash(at + 37) * Math.PI);
    ctx.globalAlpha = clamp((1 - p) * 4);
    if (at % 3 === 0) circle(ctx, 0, 0, size * 0.45, colours[at % colours.length]);
    else {
      ctx.fillStyle = colours[at % colours.length];
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawBurst(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - p;
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray * Math.PI) / 4;
    const [inner, outer] = [size * (0.25 + p * 0.3), size * (0.45 + p * 0.45)];
    line(ctx, [[Math.cos(angle) * inner, Math.sin(angle) * inner], [Math.cos(angle) * outer, Math.sin(angle) * outer]], theme.art.burst.ray, Math.max(2, size * 0.06));
  }
  starPath(ctx, 0, 0, size * (0.18 + p * 0.1), size * 0.08);
  paint(ctx, theme.art.burst.star, theme.art.ink, Math.max(1.5, size * 0.03));
  ctx.restore();
}

export function drawDust(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let puff = 0; puff < 5; puff += 1) {
    const direction = puff % 2 ? 1 : -1;
    ellipse(ctx, x + direction * (puff + 1) * size * 0.12 * p, y - puff * 2, size * (0.08 + p * 0.08), size * 0.06, theme.art.dust, theme.art.ink, 1.5);
  }
  ctx.restore();
}

export function drawSplash(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  const { water, light } = theme.art.puddle;
  ctx.save();
  ctx.globalAlpha = 1 - p * p;
  for (let drop = 0; drop < 6; drop += 1) {
    const angle = -Math.PI * (0.15 + (0.7 * drop) / 5);
    const reach = size * (0.3 + 0.5 * p);
    circle(ctx, x + Math.cos(angle) * reach, y + Math.sin(angle) * reach + size * 0.6 * p * p, size * 0.07, drop % 2 ? light : water, theme.art.ink, 1.5);
  }
  ctx.restore();
}

export function drawZoom(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let streak = 0; streak < 3; streak += 1) {
    const top = y + (streak - 1) * size * 0.28;
    const tail = x - size * (0.5 + 0.5 * p) - streak * size * 0.06;
    line(ctx, [[tail, top], [tail + size * (0.3 + 0.2 * p), top]], theme.art.turbo, Math.max(2.5, size * 0.09));
  }
  ctx.restore();
}

export function drawMiss(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  const reach = size * 0.22;
  ctx.save();
  ctx.translate(x + Math.sin(p * Math.PI * 6) * size * 0.07 * (1 - p), y);
  ctx.globalAlpha = Math.min(1, (1 - p) * 3);
  line(ctx, [[-reach, -reach], [reach, reach]], theme.art.miss, size * 0.09);
  line(ctx, [[reach, -reach], [-reach, reach]], theme.art.miss, size * 0.09);
  ctx.restore();
}
