import { TAU, clamp, ease, ellipse, hash, line, paint, polygon, starPath } from "../../../kit/src/canvas/pen.js";
import { kindOf } from "./train.js";
import { SHAPES, shapePath } from "./wagon-art.js";

const live = (t) => t > 0 && t < 1;

export function drawNotePop(ctx, x, y, size, wagon, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const { art } = theme;
  const look = art.wagons[kindOf(wagon)];
  const grown = 0.45 + ease(Math.min(1, t * 2.4)) * 0.55;
  ctx.save();
  ctx.translate(x, y - ease(t) * size * 0.9);
  ctx.scale(grown, grown);
  ctx.rotate(Math.sin(t * Math.PI) * 0.15);
  ctx.globalAlpha = 1 - clamp((t - 0.68) / 0.32);
  shapePath(ctx, SHAPES[kindOf(wagon)], 0, 0, size * 0.28);
  paint(ctx, look.light, art.ink, Math.max(2, size * 0.035));
  line(ctx, [[size * 0.19, -size * 0.12], [size * 0.19, -size * 0.48], [size * 0.38, -size * 0.4]], art.ink, Math.max(2, size * 0.055));
  ellipse(ctx, size * 0.12, -size * 0.08, size * 0.1, size * 0.075, look.body, art.ink, Math.max(1.5, size * 0.025));
  ctx.restore();
}

export function drawBurst(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const { burst, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - clamp((t - 0.62) / 0.38);
  for (let piece = 0; piece < 12; piece += 1) {
    const angle = (piece * TAU) / 12;
    const far = size * (0.18 + ease(t) * 0.55);
    ctx.save();
    ctx.translate(Math.cos(angle) * far, Math.sin(angle) * far);
    ctx.rotate(angle + t * 2);
    if (piece % 3 === 0) {
      starPath(ctx, 0, 0, size * 0.09);
      paint(ctx, burst.star, ink, 1.5);
    } else line(ctx, [[-size * 0.05, 0], [size * 0.05, 0]], piece % 2 ? burst.rayAlt : burst.ray, Math.max(2, size * 0.055));
    ctx.restore();
  }
  ctx.restore();
}

export function drawPuff(ctx, x, y, size, time, theme) {
  const { art } = theme;
  ctx.save();
  for (let cloud = 0; cloud < 4; cloud += 1) {
    const radius = size * (0.22 - cloud * 0.028);
    ctx.globalAlpha = 0.92 - cloud * 0.15;
    ellipse(ctx, x - cloud * size * 0.38 - radius, y - cloud * size * 0.1 + Math.sin(time * 5 + cloud) * 2, radius, radius * 0.8, art.puff, art.ink, 2);
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
    const angle = hash(seed + piece * 2.1) * TAU;
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
