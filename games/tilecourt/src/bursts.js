import { drawHintHand, drawPresent } from "../../../kit/src/canvas/index.js";
import { clamp, ease, ellipse, hash, mix, paint, starPath } from "../../../kit/src/canvas/pen.js";
import { drawLineEffect } from "./line-effects.js";
import { drawPieceCentred } from "./tiles.js";

const live = (t) => t > 0 && t < 1;

function drawStar(ctx, x, y, size, theme) {
  starPath(ctx, x, y, size / 2);
  paint(ctx, theme.art.effects.spark, theme.art.ink, Math.max(theme.stroke.thin, size * 0.07));
}

export function drawDust(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ellipse(ctx, x, y, size * (0.25 + t * 0.6), size * (0.1 + t * 0.18), null, theme.art.stoneLight, theme.stroke.base);
  ctx.restore();
}

export function drawBounce(ctx, piece, from, to, fromCell, toCell, progress, theme) {
  const t = clamp(progress);
  const travel = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const arc = Math.sin(t * Math.PI) * fromCell * 0.65;
  ctx.save();
  ctx.translate(mix(from[0], to[0], travel), mix(from[1], to[1], travel) - arc);
  ctx.rotate(Math.sin(t * Math.PI * 3) * 0.06);
  drawPieceCentred(ctx, piece, 0, 0, mix(fromCell, toCell, travel), theme);
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, seed, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  const tints = theme.art.effects.confetti;
  ctx.save();
  for (let piece = 0; piece < 28; piece += 1) {
    const size = 4 + hash(seed + piece * 8.9) * 7;
    const x = area.x + hash(seed + piece * 3.1) * area.w + (hash(seed + piece * 7.7) - 0.5) * area.w * 0.35 * t;
    const y = area.y + hash(seed + piece * 4.3) * area.h * 0.25 + t * area.h * (0.55 + hash(piece) * 0.4);
    ctx.save();
    ctx.globalAlpha = 1 - t * t;
    ctx.translate(x, y);
    ctx.rotate(t * 8 + piece);
    ctx.fillStyle = tints[piece % tints.length];
    if (piece % 3) ctx.fillRect(-size / 2, -size / 3, size, size * 0.66);
    else ellipse(ctx, 0, 0, size * 0.45, size * 0.45, tints[piece % tints.length]);
    ctx.restore();
  }
  ctx.restore();
}

export function drawStarFlight(ctx, from, to, progress, theme, count = 3) {
  const t = clamp(progress);
  if (!live(t)) return;
  for (let star = 0; star < count; star += 1) {
    const local = clamp((t - star * 0.1) / 0.8);
    if (!live(local)) continue;
    const travel = ease(local);
    drawStar(ctx, mix(from[0], to[0], travel), mix(from[1], to[1], travel) - Math.sin(local * Math.PI) * 45, 22 - local * 8, theme);
  }
}

export function drawScoreBurst(ctx, x, y, points, progress, theme, lang) {
  const t = clamp(progress);
  if (!live(t)) return;
  const words = `+${new Intl.NumberFormat(lang || "en").format(points)}`;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.font = `800 ${theme.text.burst}px ${theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.lineWidth = theme.stroke.bold;
  ctx.strokeStyle = theme.art.ink;
  ctx.fillStyle = theme.art.white;
  const rise = y - ease(t) * 45;
  ctx.strokeText(words, x, rise);
  ctx.fillText(words, x, rise);
  ctx.restore();
}

export function drawEmptyBonus(ctx, x, y, size, progress, theme) {
  const t = clamp(progress);
  if (!live(t)) return;
  [-0.28, 0, 0.28].forEach((offset, at) => {
    const rise = Math.sin(t * Math.PI) * size * (0.08 + at * 0.02) + t * size * 0.3;
    drawLineEffect(ctx, "lanterns", x + size * offset, y - rise, size * 0.35, clamp(t + at * 0.2), theme);
  });
  drawStar(ctx, x - size * 0.38, y - size * 0.28, size * 0.15, theme);
  drawStar(ctx, x + size * 0.38, y - size * 0.2, size * 0.11, theme);
}

export function drawHand(ctx, x, y, size, progress, theme) {
  drawHintHand(ctx, x, y, size, progress, theme.ui);
}

export function drawWrapped(ctx, area, shake, theme) {
  drawPresent(ctx, area, shake, theme.art.present);
}
