import { drawAvatar, finite, given } from "./face.js";
import { INK, circle, paint, polygon, roundedRect } from "./pen.js";

const CARD = "#FFF8E8";
const GOLD = "#FFC846";
const EMPTY = "#CBD5D5";

const usable = (size) => size > 0 && Number.isFinite(size);

function thinkingDots(ctx, size, time) {
  const width = size * 0.44;
  const height = size * 0.18;
  roundedRect(ctx, -width / 2, size * 0.41 - height / 2, width, height, height / 2);
  paint(ctx, CARD, INK, Math.max(1, size * 0.03));
  for (let dot = 0; dot < 3; dot += 1) {
    const rise = Math.max(0, Math.sin(time * 6 - dot * 0.9)) * size * 0.03;
    circle(ctx, (dot - 1) * size * 0.11, size * 0.41 - rise + size * 0.01, Math.max(1, size * 0.035), INK, null);
  }
}

export function drawBadge(ctx, x, y, size, options) {
  if (!usable(size)) return;
  const chosen = given(options);
  const time = finite(chosen.time);
  const thinking = chosen.thinking === true;
  ctx.save();
  ctx.translate(x, y);
  circle(ctx, 0, 0, size * 0.48, CARD, INK, Math.max(1, size * 0.03));
  drawAvatar(ctx, 0, size * 0.04, size * 0.78, { ...chosen, face: thinking ? "thinking" : chosen.face, time });
  if (thinking) thinkingDots(ctx, size, time);
  ctx.restore();
}

function star(ctx, size, filled) {
  const points = [];
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const radius = point % 2 ? size * 0.22 : size * 0.5;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  polygon(ctx, points, filled ? GOLD : EMPTY, INK, Math.max(1.5, size * 0.07));
}

export function drawStars(ctx, x, y, size, count) {
  const filled = Number.isFinite(count) ? Math.min(3, Math.max(1, Math.round(count))) : 3;
  ctx.save();
  ctx.translate(x, y);
  for (let at = 0; at < 3; at += 1) {
    ctx.save();
    ctx.translate((at - 1) * size * 1.15, at === 1 ? -size * 0.18 : 0);
    ctx.rotate((at - 1) * 0.16);
    star(ctx, size, at < filled);
    ctx.restore();
  }
  ctx.restore();
}

export function drawRoundEnd(ctx, x, y, size, options) {
  if (!usable(size)) return;
  const chosen = given(options);
  const time = finite(chosen.time);
  drawStars(ctx, x - size * 0.5, y - size * 0.36, size * 0.16, chosen.stars);
  drawAvatar(ctx, x - size * 0.5, y + size * 0.12, size * 0.6, { ...given(chosen.winner), face: "cheering", time, motion: 1, flip: false });
  drawAvatar(ctx, x + size * 0.5, y + size * 0.14, size * 0.54, { ...given(chosen.other), face: "oops", time: time + 0.3, flip: true, motion: 0 });
}
