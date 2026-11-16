import { clamp, ease, hash, line, paint, polygon, starPath } from "../../../kit/src/canvas/pen.js";

const live = (t) => t > 0 && t < 1;

export function drawBellRing(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.lineCap = "round";
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = size * (0.48 + t * 0.35 + ring * 0.15);
    for (const [from, to] of [[-Math.PI * 0.8, -Math.PI * 0.2], [Math.PI * 0.2, Math.PI * 0.8]]) {
      ctx.beginPath();
      ctx.arc(x, y, radius, from, to);
      paint(ctx, null, theme.art.bell, Math.max(3, size * 0.055));
    }
  }
  ctx.restore();
}

export function drawBounceMarks(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const spread = size * (0.3 + t * 0.25);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  for (const tilt of [-1, 0, 1]) line(ctx, [[x - spread, y + tilt * size * 0.2], [x - spread - size * (tilt ? 0.2 : 0.25), y + tilt * size * 0.35]], theme.art.miss, 5);
  ctx.restore();
}

export function drawBurst(ctx, x, y, size, progress, seed, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const { burst, ink } = theme.art;
  ctx.save();
  ctx.globalAlpha = 1 - t * t;
  for (let bit = 0; bit < 10; bit += 1) {
    const angle = hash(seed * 20 + bit) * Math.PI * 2;
    const reach = ease(t) * size * (0.55 + hash(bit + seed) * 0.6);
    const px = x + Math.cos(angle) * reach;
    const py = y + Math.sin(angle) * reach + t * t * size * 0.35;
    if (bit % 3 === 0) {
      starPath(ctx, px, py, size * 0.09 * (1 - t * 0.4));
      paint(ctx, burst.star, ink, 1.5);
      continue;
    }
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle + t * 4);
    polygon(ctx, [[-4, -8], [5, -5], [4, 8], [-5, 5]], burst.bits[bit % burst.bits.length], ink, 1.5);
    ctx.restore();
  }
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
