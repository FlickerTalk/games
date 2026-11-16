import { circle, clamp, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

export const strokeFor = (cell) => clamp(cell * 0.085, 0.75, 3);

function drawHull(ctx, theme, w, h, look, side, width) {
  const bow = w * (side === 0 ? 0.52 : 0.43);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.12);
  ctx.lineTo(w / 2 - bow * 0.22, -h * 0.12);
  ctx.quadraticCurveTo(w / 2, 0, w / 2 - bow * 0.3, h * 0.34);
  ctx.lineTo(-w / 2 + h * 0.25, h * 0.34);
  ctx.quadraticCurveTo(-w / 2, h * 0.3, -w / 2, -h * 0.12);
  ctx.closePath();
  paint(ctx, look.body, theme.ink, width);
  line(ctx, [[-w * 0.38, h * 0.12], [w * 0.34, h * 0.12]], look.light, h * 0.1);
}

function drawCabin(ctx, theme, w, h, look, side, width) {
  const cabin = Math.min(w * 0.34, h * 1.2);
  roundedRect(ctx, -cabin / 2, -h * 0.62, cabin, h * 0.53, h * 0.12);
  paint(ctx, look.light, theme.ink, width);
  roundedRect(ctx, -cabin * 0.31, -h * 0.51, cabin * 0.62, h * 0.18, h * 0.06);
  paint(ctx, theme.marks.glass, theme.ink, width * 0.7);
  if (side === 1) {
    roundedRect(ctx, -h * 0.16, -h * 0.94, h * 0.3, h * 0.36, h * 0.09);
    paint(ctx, look.dark, theme.ink, width);
    return;
  }
  line(ctx, [[-w * 0.3, -h * 0.25], [-w * 0.3, -h * 0.92]], theme.ink, width);
  polygon(ctx, [[-w * 0.3, -h * 0.9], [-w * 0.02, -h * 0.72], [-w * 0.3, -h * 0.55]], theme.marks.flag, theme.ink, width * 0.8);
}

function drawLaugh(ctx, theme, w, h, bounce) {
  const spacing = Math.min(w * 0.12, h * 0.32);
  for (const x of [-spacing, spacing]) ellipse(ctx, x, h * 0.02, h * 0.095, h * 0.13, theme.ink);
  ctx.beginPath();
  ctx.arc(0, h * 0.09, h * 0.18, 0, Math.PI);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = Math.max(0.75, h * 0.08);
  ctx.stroke();
  ellipse(ctx, 0, h * 0.2 + bounce * h * 0.04, h * 0.1, h * 0.05, theme.marks.white);
}

export function drawBoat(ctx, theme, x, y, length, cell, { side = 0, vertical = false, tilt = 0, laugh = false, bounce = 0, alpha = 1 } = {}) {
  const w = length * cell * 0.9;
  const h = cell * 0.72;
  const look = theme.boats[side];
  const width = strokeFor(cell);
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(x, y + bounce * cell * 0.06);
  if (vertical) ctx.rotate(Math.PI / 2);
  if (tilt) ctx.rotate(tilt);
  drawHull(ctx, theme, w, h, look, side, width);
  drawCabin(ctx, theme, w, h, look, side, width);
  if (laugh) drawLaugh(ctx, theme, w, h, bounce);
  ctx.restore();
}

function drawNotches(ctx, w, h, length, colour, width) {
  for (let at = 1; at < length; at += 1) {
    const x = -w / 2 + (at * w) / length;
    line(ctx, [[x, -h * 0.32], [x, h * 0.32]], colour, width);
  }
}

export function drawFleetChip(ctx, theme, { x, y, w, h }, length, { found = false, side = 0 } = {}) {
  const width = Math.max(1, h * 0.12);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (!found) {
    roundedRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    paint(ctx, null, theme.ui.muted, width);
    drawNotches(ctx, w, h, length, theme.ui.muted, width * 0.8);
    ctx.restore();
    return;
  }
  ctx.rotate(-0.18);
  roundedRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  paint(ctx, theme.boats[side].light, theme.ink, width);
  drawNotches(ctx, w, h, length, theme.ink, width * 0.8);
  line(ctx, [[-w * 0.35, h * 0.62], [w * 0.35, -h * 0.62]], theme.marks.paint, Math.max(1.5, h * 0.2));
  ctx.restore();
}

export function drawSideMark(ctx, theme, x, y, size, side) {
  const look = theme.boats[side];
  const width = Math.max(1.2, size * 0.06);
  ctx.save();
  ctx.translate(x, y);
  if (side === 0) {
    circle(ctx, 0, 0, size * 0.43, look.body, theme.ink, width);
    line(ctx, [[-size * 0.15, size * 0.18], [-size * 0.15, -size * 0.26]], theme.ink, width);
    polygon(ctx, [[-size * 0.12, -size * 0.24], [size * 0.23, -size * 0.1], [-size * 0.12, size * 0.02]], theme.marks.flag, theme.ink, width * 0.8);
  } else {
    polygon(ctx, [[0, -size * 0.45], [size * 0.45, 0], [0, size * 0.45], [-size * 0.45, 0]], look.body, theme.ink, width);
    roundedRect(ctx, -size * 0.2, -size * 0.06, size * 0.4, size * 0.22, size * 0.05);
    paint(ctx, theme.marks.white, theme.ink, width * 0.8);
    roundedRect(ctx, size * 0.03, -size * 0.28, size * 0.12, size * 0.22, size * 0.03);
    paint(ctx, look.dark, theme.ink, width * 0.8);
  }
  ctx.restore();
}

export function sideMark(side) {
  const { body, dark } = ART.boats[side];
  const { ink } = ART;
  const { flag, white } = ART.marks;
  const drawing =
    side === 0
      ? `<circle r="20" fill="${body}" stroke="${ink}" stroke-width="2.4"/><path d="M-6.9 8.3V-12" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/><path d="M-5.5-11 10.6-4.6-5.5.9z" fill="${flag}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>`
      : `<polygon points="0,-21 21,0 0,21 -21,0" fill="${body}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/><rect x="-9.2" y="-2.8" width="18.4" height="10.1" rx="2.3" fill="${white}" stroke="${ink}" stroke-width="1.8"/><rect x="1.4" y="-12.9" width="5.5" height="10.1" rx="1.2" fill="${dark}" stroke="${ink}" stroke-width="1.8"/>`;
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${drawing}</svg>`;
}
