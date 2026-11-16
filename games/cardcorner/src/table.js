import { paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawBack, drawFace } from "../../../kit/src/cards/faces.js";
import { boardFrame, drawBoardFrame } from "../../../kit/src/tabletop/frame.js";
import { easeInOut } from "../../../kit/src/tabletop/motion.js";

export const LEAST = 44;
const MOST_BACKS = 10;

export const frameOf = (size) => boardFrame(size, { padding: 0.012 });

export function drawFelt(ctx, theme, frame, table) {
  const { inner } = frame;
  drawBoardFrame(ctx, frame, { wood: table.felt, ink: theme.ink, rim: theme.rim });
  const inset = inner.w * 0.008;
  ctx.save();
  ctx.setLineDash([inner.w * 0.012, inner.w * 0.018]);
  roundedRect(ctx, inner.x + inset, inner.y + inset, inner.w - inset * 2, inner.h - inset * 2, frame.radius * 0.7);
  paint(ctx, null, table.line, Math.max(1, inner.w * 0.004));
  ctx.setLineDash([]);
  ctx.restore();
}

export const faceAt = (ctx, theme, sprites, card, box, ratio, at) => sprites.draw(ctx, `f${card}`, box, (pen, size) => drawFace(pen, theme, card, 0, 0, size.w), ratio, at);
export const backAt = (ctx, theme, sprites, box, ratio, at) => sprites.draw(ctx, "back", box, (pen, size) => drawBack(pen, theme, 0, 0, size.w), ratio, at);

export function atLeast(box, size, least = LEAST) {
  const [w, h] = [Math.max(box.w, least), Math.max(box.h, least)];
  const x = Math.min(Math.max(0, box.x - (w - box.w) / 2), size - w);
  const y = Math.min(Math.max(0, box.y - (h - box.h) / 2), size - h);
  return { x, y, w, h };
}

export function cardRow(box, count, { w, h }, { step = 1.08 } = {}) {
  if (!count) return [];
  const spacing = count > 1 ? Math.min(w * step, (box.w - w) / (count - 1)) : 0;
  const left = box.x + (box.w - w - spacing * (count - 1)) / 2;
  return Array.from({ length: count }, (_, at) => ({ x: left + at * spacing, y: box.y, w, h }));
}

export function backRow(box, count, { w, h }, countHeight, countWidth = countHeight * 1.5) {
  const shown = Math.min(count, MOST_BACKS);
  const step = w * 0.36;
  const group = w + Math.max(0, shown - 1) * step + box.w * 0.02 + countWidth;
  const left = box.x + (box.w - group) / 2;
  return { backs: Array.from({ length: shown }, (_, at) => ({ x: left + at * step, y: box.y, w, h })), count: { x: left + group - countWidth, y: box.y + h / 2 } };
}

export function drawStack(ctx, theme, sprites, box, count, ratio) {
  if (!count) return;
  const layers = Math.min(3, Math.ceil(count / 12));
  const shift = Math.max(1, box.w * 0.025);
  for (let layer = layers - 1; layer >= 0; layer -= 1) backAt(ctx, theme, sprites, { ...box, x: box.x + layer * shift, y: box.y + layer * shift }, ratio);
}

const between = (from, to, amount) => ({ x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount, w: from.w + (to.w - from.w) * amount, h: from.h + (to.h - from.h) * amount });

export const flightDone = ({ delay = 0, ms }, elapsed) => elapsed >= delay + ms;

export function drawFlight(ctx, theme, sprites, flight, elapsed, ratio) {
  const { card, from, to, delay = 0, since = 0, ms, flip = null } = flight;
  if (elapsed < since || flightDone(flight, elapsed)) return;
  const progress = Math.min(1, Math.max(0, (elapsed - delay) / ms));
  const box = between(from, to, easeInOut(progress));
  const faceUp = card !== null && (flip === "up" ? progress >= 0.5 : flip === "down" ? progress < 0.5 : true);
  const squash = flip ? Math.max(0.05, Math.abs(Math.cos(progress * Math.PI))) : 1;
  const local = { x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h };
  const at = to.w >= from.w ? to : from;
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.scale(squash, 1);
  if (faceUp) faceAt(ctx, theme, sprites, card, local, ratio, at);
  else backAt(ctx, theme, sprites, local, ratio, at);
  ctx.restore();
}
