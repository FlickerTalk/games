import { TAU, circle, clamp, ease, hash, line, paint, starPath } from "../../../kit/src/canvas/pen.js";

export function drawSwipeTrail(ctx, points, theme, { width = 14 } = {}) {
  if (!points || points.length < 2) return;
  const { effects } = theme.art;
  ctx.save();
  ctx.globalAlpha = 0.75;
  line(ctx, points, effects.swipe, width);
  ctx.globalAlpha = 1;
  line(ctx, points, effects.swipeCore, Math.max(2, width * 0.25));
  ctx.restore();
}

export function drawHalo(ctx, x, y, size, theme, { active = false } = {}) {
  const { effects } = theme.art;
  ctx.save();
  ctx.globalAlpha = active ? 0.42 : 0.2;
  circle(ctx, x, y, size / 2, effects.halo, effects.haloEdge, 3);
  ctx.restore();
}

export function drawWarningRing(ctx, x, y, size, progress, theme, { caught = false } = {}) {
  const { effects } = theme.art;
  const pulse = ease(progress);
  ctx.save();
  ctx.globalAlpha = 0.35 + pulse * 0.65;
  circle(ctx, x, y, size * 0.48, effects.ringFill, effects.ring, 3);
  circle(ctx, x, y, size * (0.25 + pulse * 0.25), null, effects.ring, 6);
  if (caught) line(ctx, [[x - size * 0.15, y], [x - size * 0.03, y + size * 0.11], [x + size * 0.18, y - size * 0.15]], effects.caught, 6);
  else circle(ctx, x, y, 5 + pulse * 4, effects.ring);
  ctx.restore();
}

function star(ctx, x, y, size, colour, rotation, theme) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  starPath(ctx, 0, 0, size / 2);
  paint(ctx, colour, theme.art.ink, theme.stroke.thin);
  ctx.restore();
}

export function drawBurst(ctx, x, y, size, progress, theme, { kind = "confetti", seed = 1 } = {}) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const { effects } = theme.art;
  const count = kind === "stars" ? 7 : 14;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let at = 0; at < count; at += 1) {
    const angle = hash(seed + at) * TAU;
    const reach = ease(p) * size * (0.35 + hash(seed + at * 3) * 0.65);
    const px = x + Math.cos(angle) * reach;
    const py = y + Math.sin(angle) * reach + p * p * size * 0.3;
    if (kind === "stars" || at % 4 === 0) star(ctx, px, py, 10 + hash(at + seed) * 10, at % 2 ? effects.star : effects.starAlt, p * 4 + at, theme);
    else {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p * 5 + at);
      ctx.fillStyle = effects.confetti[at % effects.confetti.length];
      ctx.fillRect(-3, -7, 6, 14);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawRipple(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const { effects } = theme.art;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  circle(ctx, x, y, size * (0.15 + p * 0.4), null, effects.caught, 7 * (1 - p) + 1);
  circle(ctx, x, y, size * (0.05 + p * 0.28), null, effects.ripple, 4);
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, theme) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const { confetti } = theme.art.effects;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - p) * 2);
  for (let at = 0; at < 26; at += 1) {
    const px = area.x + hash(at * 7 + 1) * area.w + Math.sin(p * 6 + at) * 10;
    const py = area.y - 20 + p * (area.h * (0.5 + hash(at * 13 + 5) * 0.6));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(p * 6 + at);
    ctx.fillStyle = confetti[at % confetti.length];
    ctx.fillRect(-3, -7, 6, 14);
    ctx.restore();
  }
  ctx.restore();
}
