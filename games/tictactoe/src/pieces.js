import { TAU, circle, clamp, ellipse, line } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

const REACH = 0.32;
const INK = 0.25;
const BODY = 0.16;

const overshoot = (value) => {
  const t = clamp(value) - 1;
  return 1 + 2.70158 * t ** 3 + 1.70158 * t ** 2;
};

function drawCross(ctx, theme, size, colour) {
  const reach = size * REACH;
  const bars = [
    [[-reach, -reach], [reach, reach]],
    [[reach, -reach], [-reach, reach]],
  ];
  for (const bar of bars) line(ctx, bar, theme.ink, size * INK);
  for (const bar of bars) line(ctx, bar, colour, size * BODY);
}

function drawRing(ctx, theme, size, colour) {
  circle(ctx, 0, 0, size * REACH, null, theme.ink, size * INK);
  circle(ctx, 0, 0, size * REACH, null, colour, size * BODY);
}

function drawFace(ctx, theme, size, face) {
  const eyes = [-1, 1].map((side) => side * size * 0.075);
  const top = -size * 0.055;
  for (const x of eyes) ellipse(ctx, x, top, size * 0.035, size * 0.052, theme.marks.white);
  for (const x of eyes) ellipse(ctx, x, top + size * 0.008, size * 0.016, size * 0.025, theme.ink);
  ctx.beginPath();
  if (face === "surprised") ctx.ellipse(0, size * 0.095, size * 0.035, size * 0.045, 0, 0, TAU);
  else ctx.arc(0, size * 0.04, size * 0.11, 0.25, Math.PI - 0.25);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = Math.max(1.5, size * 0.025);
  ctx.lineCap = "round";
  ctx.stroke();
}

export function drawPiece(ctx, theme, x, y, size, { side = 0, grow = 1, alpha = 1, lift = 0, tilt = 0, face = "calm" } = {}) {
  const scale = overshoot(grow);
  if (scale <= 0.01) return;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y - lift);
  if (tilt) ctx.rotate(tilt);
  ctx.scale(scale, scale);
  (side === 0 ? drawCross : drawRing)(ctx, theme, size, theme.pieces[side].body);
  drawFace(ctx, theme, size, face);
  ctx.restore();
}

const SHAPES = [
  (stroke, width) => `<path d="M-16-16 16 16M16-16-16 16" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`,
  (stroke, width) => `<circle r="16" fill="none" stroke="${stroke}" stroke-width="${width}"/>`,
];

const FACE = `<g fill="${ART.marks.white}"><ellipse cx="-3.75" cy="-2.75" rx="1.75" ry="2.6"/><ellipse cx="3.75" cy="-2.75" rx="1.75" ry="2.6"/></g><g fill="${ART.ink}"><ellipse cx="-3.75" cy="-2.35" rx="0.8" ry="1.25"/><ellipse cx="3.75" cy="-2.35" rx="0.8" ry="1.25"/></g><path d="M5.33 3.36A5.5 5.5 0 0 1-5.33 3.36" fill="none" stroke="${ART.ink}" stroke-width="1.25" stroke-linecap="round"/>`;

export function sideMark(side) {
  const shape = SHAPES[side];
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${shape(ART.ink, 12.5)}${shape(ART.pieces[side].body, 8)}${FACE}</svg>`;
}
