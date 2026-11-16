import { circle, line, withRim } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

const SHINE = [Math.PI * 1.08, Math.PI * 1.55];

function drawMark(ctx, theme, mark, r) {
  if (mark === "cross") {
    const reach = r * 0.32;
    line(ctx, [[-reach, -reach], [reach, reach]], theme.ink, r * 0.18);
    line(ctx, [[reach, -reach], [-reach, reach]], theme.ink, r * 0.18);
    return;
  }
  circle(ctx, 0, 0, r * 0.25, null, theme.marks.white, r * 0.14);
}

function drawBody(ctx, theme, { body, light }, r) {
  circle(ctx, 0, 0, r, body, theme.ink, Math.max(2, r * 0.09));
  ctx.beginPath();
  ctx.arc(-r * 0.08, -r * 0.08, r * 0.72, ...SHINE);
  ctx.strokeStyle = light;
  ctx.lineWidth = r * 0.13;
  ctx.lineCap = "round";
  ctx.stroke();
}

export function drawDisc(ctx, theme, x, y, radius, { side = 0, alpha = 1, scale = 1, ring = false, rim = null } = {}) {
  const look = theme.pieces[side];
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (scale !== 1) ctx.scale(scale, scale);
  withRim(ctx, { ink: theme.ink, colour: rim }, () => drawBody(ctx, theme, look, radius));
  drawMark(ctx, theme, look.mark, radius);
  if (ring) circle(ctx, 0, 0, radius * 1.15, null, theme.marks.white, Math.max(2, radius * 0.07));
  ctx.restore();
}

export function sideMark(side) {
  const { body, light, mark } = ART.pieces[side];
  const ink = ART.ink;
  const centre =
    mark === "cross"
      ? `<path d="M-6.4-6.4 6.4 6.4M6.4-6.4-6.4 6.4" stroke="${ink}" stroke-width="3.6" stroke-linecap="round"/>`
      : `<circle r="5" fill="none" stroke="${ART.marks.white}" stroke-width="2.8"/>`;
  return `<svg viewBox="-23 -23 46 46" aria-hidden="true"><circle r="20" fill="${body}" stroke="${ink}" stroke-width="2"/><path d="M-15.55-5.18A14.4 14.4 0 0 1 .65-15.82" fill="none" stroke="${light}" stroke-width="2.6" stroke-linecap="round"/>${centre}</svg>`;
}
