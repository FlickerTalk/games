import { circle, clamp, ease } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

const EDGE_DROP = 0.08;
const THINNEST = 0.055;

function drawSign(ctx, { sign, mark }, r) {
  if (sign === "ring") {
    circle(ctx, 0, 0, r * 0.36, null, mark, r * 0.1);
    circle(ctx, 0, 0, r * 0.09, mark);
    return;
  }
  for (let dot = 0; dot < 4; dot += 1) {
    const angle = Math.PI / 4 + (dot * Math.PI) / 2;
    circle(ctx, Math.cos(angle) * r * 0.34, Math.sin(angle) * r * 0.34, r * 0.1, mark);
  }
}

export function drawDisc(ctx, theme, x, y, radius, { side = 0, flip = 1, pop = 1, alpha = 1 } = {}) {
  const grown = ease(pop);
  if (grown <= 0) return;
  const turned = clamp(flip);
  const look = theme.pieces[turned < 0.5 ? 1 - side : side];
  const outline = Math.max(1.5, radius * 0.09);
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(Math.max(THINNEST, Math.abs(Math.cos(turned * Math.PI))) * grown, grown);
  circle(ctx, 0, radius * EDGE_DROP, radius, look.edge, theme.ink, outline);
  circle(ctx, 0, 0, radius, look.body, theme.ink, outline);
  circle(ctx, -radius * 0.25, -radius * 0.28, radius * 0.12, look.shine);
  drawSign(ctx, look, radius);
  ctx.restore();
}

export function sideMark(side) {
  const { body, edge, shine, mark, sign } = ART.pieces[side];
  const face =
    sign === "ring"
      ? `<circle r="7.2" fill="none" stroke="${mark}" stroke-width="2"/><circle r="1.8" fill="${mark}"/>`
      : [45, 135, 225, 315].map((angle) => `<circle cx="${(Math.cos((angle * Math.PI) / 180) * 6.8).toFixed(2)}" cy="${(Math.sin((angle * Math.PI) / 180) * 6.8).toFixed(2)}" r="2" fill="${mark}"/>`).join("");
  return `<svg viewBox="-24 -24 48 50" aria-hidden="true"><circle cy="1.6" r="20" fill="${edge}" stroke="${ART.ink}" stroke-width="2"/><circle r="20" fill="${body}" stroke="${ART.ink}" stroke-width="2"/><circle cx="-5" cy="-5.6" r="2.4" fill="${shine}"/>${face}</svg>`;
}
