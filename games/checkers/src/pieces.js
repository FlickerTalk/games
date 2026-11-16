import { circle, clamp, ease, line, paint, polygon } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

const CROWN = [[-0.48, 0.28], [-0.52, -0.3], [-0.18, -0.04], [0, -0.48], [0.18, -0.04], [0.52, -0.3], [0.48, 0.28]];

const diamond = (r) => [[0, -r], [r, 0], [0, r], [-r, 0]];

export function drawCrown(ctx, theme, x, y, size, progress = 1) {
  const scale = ease(progress) * (1 + Math.sin(clamp(progress) * Math.PI) * 0.18);
  if (scale <= 0) return;
  const width = Math.max(1.5, size * 0.07);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  polygon(ctx, CROWN.map(([px, py]) => [px * size, py * size]), theme.marks.crown, theme.ink, width);
  line(ctx, [[-0.43 * size, 0.39 * size], [0.43 * size, 0.39 * size]], theme.ink, width);
  ctx.restore();
}

function drawMark(ctx, theme, { body, mark }, r) {
  const width = Math.max(1.5, r * 0.07);
  if (mark === "diamond") {
    polygon(ctx, diamond(r * 0.3), body, theme.ink, width);
    circle(ctx, 0, 0, r * 0.075, theme.marks.white);
    return;
  }
  circle(ctx, 0, 0, r * 0.28, body, theme.ink, width);
  circle(ctx, 0, 0, r * 0.1, theme.marks.white);
}

function drawDisc(ctx, theme, look, r) {
  circle(ctx, 0, r * 0.08, r, look.body, theme.ink, Math.max(2, r * 0.09));
  circle(ctx, 0, -r * 0.04, r * 0.78, look.top, theme.ink, Math.max(1.5, r * 0.055));
  ctx.beginPath();
  ctx.arc(0, -r * 0.04, r * 0.6, Math.PI * 1.08, Math.PI * 1.82);
  ctx.strokeStyle = theme.marks.white;
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.lineCap = "round";
  ctx.stroke();
  drawMark(ctx, theme, look, r);
}

export function drawPiece(ctx, theme, x, y, radius, { side = 0, king = false, crown = king ? 1 : 0, alpha = 1, lift = 0 } = {}) {
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(x, y - lift);
  drawDisc(ctx, theme, theme.pieces[side], radius);
  if (crown > 0) drawCrown(ctx, theme, 0, -radius * 0.13, radius * 1.12, crown);
  ctx.restore();
}

export function sideMark(side) {
  const { body, top, mark } = ART.pieces[side];
  const ink = ART.ink;
  const centre =
    mark === "diamond"
      ? `<polygon points="0,-6 6,0 0,6 -6,0" fill="${body}" stroke="${ink}" stroke-width="1.7"/><circle r="1.5" fill="${ART.marks.white}"/>`
      : `<circle r="5.6" fill="${body}" stroke="${ink}" stroke-width="1.7"/><circle r="2" fill="${ART.marks.white}"/>`;
  return `<svg viewBox="-24 -24 48 50" aria-hidden="true"><circle cy="1.6" r="20" fill="${body}" stroke="${ink}" stroke-width="2.4"/><circle cy="-0.8" r="15.6" fill="${top}" stroke="${ink}" stroke-width="1.6"/>${centre}</svg>`;
}
