import { circle, clamp, ease, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

export const strokeOf = (length) => Math.max(2.5, length * 0.095);

function strokeCross(ctx, reach, colour, width) {
  ctx.beginPath();
  ctx.moveTo(-reach, -reach);
  ctx.lineTo(reach, reach);
  ctx.moveTo(reach, -reach);
  ctx.lineTo(-reach, reach);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
}

export function drawEmblem(ctx, theme, x, y, size, side) {
  if (!(size > 0)) return;
  const { body, mark } = theme.pieces[side];
  ctx.save();
  ctx.translate(x, y);
  if (mark === "cross") {
    strokeCross(ctx, size * 0.345, theme.ink, size * 0.32);
    strokeCross(ctx, size * 0.345, body, size * 0.23);
  } else {
    circle(ctx, 0, 0, size * 0.34, theme.marks.white, theme.ink, size * 0.1);
    circle(ctx, 0, 0, size * 0.34, null, body, size * 0.14);
  }
  ctx.restore();
}

export function drawLine(ctx, theme, x, y, length, { side, horizontal = true, progress = 1, alpha = 1 }) {
  const thickness = strokeOf(length);
  const reach = length * 0.44 * clamp(progress);
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (!horizontal) ctx.rotate(Math.PI / 2);
  const known = side === 0 || side === 1;
  if (reach > 0) {
    line(ctx, [[-reach, 0], [reach, 0]], theme.ink, thickness * (known ? 1.35 : 1));
    if (known) line(ctx, [[-reach, 0], [reach, 0]], theme.pieces[side].body, thickness);
  }
  if (known) drawEmblem(ctx, theme, 0, 0, thickness * 2.6 * (progress >= 1 ? 1 : ease(progress)), side);
  ctx.restore();
}

export function drawClaimedBox(ctx, theme, x, y, size, side, { pop = 1 } = {}) {
  const scale = 0.72 + ease(pop) * 0.28;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  roundedRect(ctx, -size * 0.45, -size * 0.45, size * 0.9, size * 0.9, size * 0.12);
  paint(ctx, theme.board[`tile${side}`], theme.ink, size * 0.035);
  line(ctx, [[-size * 0.35, size * 0.29], [size * 0.35, size * 0.29]], theme.pieces[side].body, size * 0.04);
  drawEmblem(ctx, theme, 0, 0, size * 0.54, side);
  ctx.restore();
}

export function sideMark(side) {
  const { body, mark } = ART.pieces[side];
  const ink = ART.ink;
  const shape =
    mark === "cross"
      ? ["14.1", "10.1"].map((width, at) => `<path d="M-15.2-15.2 15.2 15.2M15.2-15.2-15.2 15.2" fill="none" stroke="${at ? body : ink}" stroke-width="${width}" stroke-linecap="round"/>`).join("")
      : `<circle r="15" fill="${ART.marks.white}" stroke="${ink}" stroke-width="4.4"/><circle r="15" fill="none" stroke="${body}" stroke-width="6.2"/>`;
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${shape}</svg>`;
}
