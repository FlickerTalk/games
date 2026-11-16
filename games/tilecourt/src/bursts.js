import { drawStar } from "./bar.js";
import { drawLineEffect } from "./line-effects.js";
import { clamp, ease, ellipse, hash, line, mix, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawPieceCentred } from "./tiles.js";

const live = (t) => t > 0 && t < 1;

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
    drawStar(ctx, mix(from[0], to[0], travel), mix(from[1], to[1], travel) - Math.sin(local * Math.PI) * 45, 22 - local * 8, true, theme);
  }
}

export function drawScoreBurst(ctx, x, y, points, progress, theme, lang) {
  const t = clamp(progress);
  if (!live(t)) return;
  const words = `+${new Intl.NumberFormat(lang || "en").format(points)}`;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.font = `800 ${theme.ui.text.burst}px ${theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.lineWidth = theme.stroke.bold;
  ctx.strokeStyle = theme.ui.ink;
  ctx.fillStyle = theme.ui.icon;
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
  drawStar(ctx, x - size * 0.38, y - size * 0.28, size * 0.15, true, theme);
  drawStar(ctx, x + size * 0.38, y - size * 0.2, size * 0.11, true, theme);
}

export function drawHand(ctx, x, y, size, progress, theme) {
  const { ui, stroke } = theme;
  const press = 0.92 + Math.sin(clamp(progress) * Math.PI * 2) * 0.08;
  const width = Math.max(stroke.thin, size * 0.045);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(press, press);
  ctx.globalAlpha = 0.25;
  ellipse(ctx, 0, 0, size * 0.3, size * 0.3, ui.icon);
  ctx.globalAlpha = 1;
  roundedRect(ctx, -size * 0.11, -size * 0.04, size * 0.24, size * 0.55, size * 0.11);
  paint(ctx, ui.card, ui.ink, width);
  roundedRect(ctx, -size * 0.08, -size * 0.45, size * 0.17, size * 0.51, size * 0.085);
  paint(ctx, ui.card, ui.ink, width);
  for (let finger = 0; finger < 3; finger += 1) {
    roundedRect(ctx, size * (0.08 + finger * 0.08), size * (0.06 + finger * 0.025), size * 0.12, size * 0.32, size * 0.06);
    paint(ctx, ui.card, ui.ink, Math.max(stroke.hair, size * 0.035));
  }
  polygon(ctx, [[-size * 0.12, size * 0.42], [size * 0.25, size * 0.42], [size * 0.3, size * 0.68], [-size * 0.18, size * 0.68]], ui.accent, ui.ink, width);
  ctx.restore();
}

export function drawWrapped(ctx, { x, y, w, h }, shake, theme) {
  const { effects, ink } = theme.art;
  const width = theme.stroke.thin;
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.rotate(Math.sin(clamp(shake) * Math.PI * 4) * 0.12 * (1 - clamp(shake)));
  ctx.translate(-w / 2, -h);
  roundedRect(ctx, w * 0.1, h * 0.3, w * 0.8, h * 0.66, w * 0.08);
  paint(ctx, effects.gift, ink, width);
  roundedRect(ctx, w * 0.04, h * 0.2, w * 0.92, h * 0.18, w * 0.05);
  paint(ctx, effects.giftLid, ink, width);
  ctx.fillStyle = effects.ribbon;
  ctx.fillRect(w * 0.43, h * 0.22, w * 0.14, h * 0.72);
  ellipse(ctx, w * 0.38, h * 0.13, w * 0.15, h * 0.09, effects.ribbon, ink, width);
  ellipse(ctx, w * 0.62, h * 0.13, w * 0.15, h * 0.09, effects.ribbon, ink, width);
  line(ctx, [[w * 0.5, h * 0.2], [w * 0.5, h * 0.12]], ink, width);
  ctx.restore();
}
