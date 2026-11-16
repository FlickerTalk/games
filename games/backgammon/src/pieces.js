import { circle, line, polygon } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const diamond = (r) => [[0, -r * 0.38], [r * 0.3, 0], [0, r * 0.38], [-r * 0.3, 0]];

function drawSign(ctx, theme, look, r) {
  if (look.mark === "diamond") {
    polygon(ctx, diamond(r), look.sign, look.sign, 1);
    return;
  }
  for (const offset of [-0.16, 0.16]) line(ctx, [[-r * 0.36, r * offset], [r * 0.36, r * offset]], look.sign, Math.max(2, r * 0.13));
}

export function drawStackCount(ctx, theme, x, y, r, count, side = 0) {
  ctx.save();
  ctx.font = `800 ${Math.round(r * 1.05)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = theme.pieces[side].sign;
  ctx.fillText(String(count), x, y);
  ctx.restore();
}

export function drawChecker(ctx, theme, x, y, r, { side = 0, alpha = 1, lift = 0, count = 0 } = {}) {
  const look = theme.pieces[side];
  const outline = Math.max(1.5, r * 0.09);
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y - lift);
  circle(ctx, 0, r * 0.09, r, look.dark, theme.ink, outline);
  circle(ctx, 0, 0, r, look.body, theme.ink, outline);
  circle(ctx, 0, 0, r * 0.79, null, look.light, r * 0.1);
  circle(ctx, 0, 0, r * 0.61, null, look.dark, r * 0.055);
  if (count > 1) drawStackCount(ctx, theme, 0, r * 0.04, r, count, side);
  else drawSign(ctx, theme, look, r);
  ctx.restore();
}

export function sideMark(side) {
  const { body, light, dark, sign, mark } = ART.pieces[side];
  const ink = ART.ink;
  const centre =
    mark === "diamond"
      ? `<polygon points="0,-7.6 6,0 0,7.6 -6,0" fill="${sign}"/>`
      : `<line x1="-7.2" y1="-3.2" x2="7.2" y2="-3.2" stroke="${sign}" stroke-width="2.6" stroke-linecap="round"/><line x1="-7.2" y1="3.2" x2="7.2" y2="3.2" stroke="${sign}" stroke-width="2.6" stroke-linecap="round"/>`;
  return `<svg viewBox="-24 -24 48 50" aria-hidden="true"><circle cy="1.8" r="20" fill="${dark}" stroke="${ink}" stroke-width="2.2"/><circle r="20" fill="${body}" stroke="${ink}" stroke-width="2.2"/><circle r="15.8" fill="none" stroke="${light}" stroke-width="2"/><circle r="12.2" fill="none" stroke="${dark}" stroke-width="1.1"/>${centre}</svg>`;
}
