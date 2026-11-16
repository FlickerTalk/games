import { ellipse, polygon } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

const SHADOW_ALPHA = 0.18;

function drawSign(ctx, { sign, mark, shine }, r) {
  if (sign === "diamond") {
    ellipse(ctx, -r * 0.27, -r * 0.3, r * 0.24, r * 0.13, shine);
    polygon(ctx, [[0, -r * 0.25], [r * 0.2, 0], [0, r * 0.25], [-r * 0.2, 0]], mark);
    return;
  }
  ellipse(ctx, 0, 0, r * 0.4, r * 0.4, null, mark, Math.max(1.5, r * 0.12));
  ellipse(ctx, -r * 0.28, -r * 0.33, r * 0.18, r * 0.1, shine);
}

export function drawStone(ctx, theme, x, y, radius, { side = 0, alpha = 1, scale = 1, lift = 0 } = {}) {
  if (scale <= 0) return;
  const look = theme.pieces[side];
  const r = radius * scale;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.save();
  ctx.globalAlpha *= SHADOW_ALPHA;
  ellipse(ctx, 0, r * 0.72, r * 0.72, r * 0.22, theme.ink);
  ctx.restore();
  ctx.translate(0, -lift);
  ellipse(ctx, 0, r * 0.12, r, r * 0.94, look.body, theme.ink, Math.max(1.5, r * 0.13));
  drawSign(ctx, look, r);
  ctx.restore();
}

export function sideMark(side) {
  const { body, shine, mark, sign } = ART.pieces[side];
  const face =
    sign === "diamond"
      ? `<ellipse cx="-5.4" cy="-6" rx="4.8" ry="2.6" fill="${shine}"/><polygon points="0,-5 4,0 0,5 -4,0" fill="${mark}"/>`
      : `<circle r="8" fill="none" stroke="${mark}" stroke-width="2.4"/><ellipse cx="-5.6" cy="-6.6" rx="3.6" ry="2" fill="${shine}"/>`;
  return `<svg viewBox="-24 -24 48 50" aria-hidden="true"><ellipse cy="2.4" rx="20" ry="18.8" fill="${body}" stroke="${ART.ink}" stroke-width="2.6"/>${face}</svg>`;
}
