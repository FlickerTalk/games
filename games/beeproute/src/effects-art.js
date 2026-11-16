import { clamp, ellipse, hash, line, paint, polygon, starPath } from "../../../kit/src/canvas/pen.js";

const live = (t) => t > 0 && t < 1;

export function drawCollectBurst(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const { art } = theme;
  const radius = size * (0.2 + t * 0.55);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray * Math.PI) / 4;
    const inner = radius * 0.65;
    line(ctx, [[x + Math.cos(angle) * inner, y + Math.sin(angle) * inner], [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]], ray % 2 ? art.burst.ray : art.burst.rayAlt, Math.max(2, size * 0.05));
  }
  starPath(ctx, x, y, size * (0.24 + t * 0.12));
  paint(ctx, art.burst.star, art.ink, 2);
  ctx.restore();
}

export function drawPopRing(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const { art } = theme;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ellipse(ctx, x, y, size * t * 0.5, size * t * 0.5, null, art.puddle.light, Math.max(2, size * 0.06 * (1 - t)));
  ellipse(ctx, x, y, size * t * 0.32, size * t * 0.32, null, art.puddle.water, Math.max(2, size * 0.04 * (1 - t)));
  ctx.restore();
}

export function drawDustPuff(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  ctx.save();
  ctx.globalAlpha = (1 - t) * 0.75;
  [-1, 0, 1].forEach((side, at) => {
    const px = x + side * size * 0.25 * t;
    const py = y + (at - 1) * size * 0.1 - t * size * 0.15;
    ellipse(ctx, px, py, size * (0.12 + t * 0.1), size * (0.09 + t * 0.08), theme.art.dust);
  });
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, seed, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const tints = theme.art.confetti;
  const x = area.x + area.w / 2;
  const y = area.y + area.h * 0.3;
  ctx.save();
  ctx.globalAlpha = clamp(1 - Math.max(0, t - 0.72) / 0.28);
  for (let piece = 0; piece < 24; piece += 1) {
    const angle = hash(seed + piece * 2.1) * Math.PI * 2;
    const speed = 0.35 + hash(seed + piece * 3.7) * 0.6;
    const size = 5 + hash(seed + piece * 4.3) * 7;
    ctx.save();
    ctx.translate(x + Math.cos(angle) * area.w * 0.5 * speed * t, y + Math.sin(angle) * area.h * 0.35 * speed * t + area.h * 0.3 * t * t);
    ctx.rotate(t * 8 + piece);
    if (piece % 3 === 0) {
      starPath(ctx, 0, 0, size * 0.65);
      paint(ctx, tints[piece % tints.length], null, 0);
    } else polygon(ctx, [[-size / 2, -size / 3], [size / 2, -size / 3], [size / 2, size / 3], [-size / 2, size / 3]], tints[piece % tints.length]);
    ctx.restore();
  }
  ctx.restore();
}
