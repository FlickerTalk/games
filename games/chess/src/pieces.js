import { ellipse, line, paint, polygon, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

const HEXAGON = [[-26, 31], [26, 31], [33, 39], [26, 47], [-26, 47], [-33, 39]];
const BATTLEMENTS = [[-25, -37], [-25, -18], [-15, -18], [-15, -28], [-5, -28], [-5, -18], [5, -18], [5, -28], [15, -28], [15, -18], [25, -18], [25, -37]];
const KING_CROWN = [[-22, -23], [0, -33], [22, -23], [17, -8], [-17, -8]];

function base(ctx, pen) {
  if (pen.side === 0) {
    roundedRect(ctx, -32, 31, 64, 15, 7);
    paint(ctx, pen.fill, pen.ink, 4);
  } else polygon(ctx, HEXAGON, pen.fill, pen.ink, 4);
  line(ctx, [[-23, 36], [23, 36]], pen.shade, 3);
  if (pen.band) line(ctx, [[-18, 43], [18, 43]], pen.band, 2);
}

function body(ctx, pen, top, bottom, half) {
  ctx.beginPath();
  ctx.moveTo(-10, top);
  ctx.bezierCurveTo(-10, top + 14, -half, bottom - 7, -half - 4, bottom);
  ctx.quadraticCurveTo(0, bottom + 7, half + 4, bottom);
  ctx.bezierCurveTo(half, bottom - 7, 10, top + 14, 10, top);
  ctx.closePath();
  paint(ctx, pen.fill, pen.ink, 4);
}

function collar(ctx, pen, y, width) {
  roundedRect(ctx, -width / 2, y, width, 8, 3);
  paint(ctx, pen.fill, pen.ink, 3);
}

function crown(ctx, pen, y) {
  const tops = Array.from({ length: 5 }, (_, at) => [-27 + (at * 54) / 4, y - (at % 2 ? 2 : 10)]);
  polygon(ctx, [[-27, y + 14], ...tops, [27, y + 14]], pen.fill, pen.ink, 4);
  for (const [x, top] of tops) ellipse(ctx, x, top, 3.2, 3.2, pen.jewel, pen.ink, 2);
}

function pawn(ctx, pen) {
  ellipse(ctx, 0, -20, 15, 15, pen.fill, pen.ink, 4);
  collar(ctx, pen, -7, 30);
  body(ctx, pen, -2, 30, 18);
}

function rook(ctx, pen) {
  polygon(ctx, BATTLEMENTS, pen.fill, pen.ink, 4);
  body(ctx, pen, -17, 30, 20);
  line(ctx, [[-20, -9], [20, -9]], pen.shade, 3);
}

function knight(ctx, pen) {
  ctx.beginPath();
  ctx.moveTo(-24, 31);
  ctx.quadraticCurveTo(-8, 8, -12, -8);
  ctx.lineTo(-27, 1);
  ctx.quadraticCurveTo(-34, -2, -28, -12);
  ctx.lineTo(-10, -30);
  ctx.lineTo(-13, -44);
  ctx.lineTo(0, -37);
  ctx.quadraticCurveTo(25, -32, 28, -5);
  ctx.quadraticCurveTo(27, 18, 20, 31);
  ctx.closePath();
  paint(ctx, pen.fill, pen.ink, 4);
  ellipse(ctx, -8, -20, 2.5, 3, pen.ink);
  line(ctx, [[-25, -7], [-17, -8]], pen.shade, 3);
  line(ctx, [[8, -31], [17, -12], [14, 5]], pen.shade, 4);
}

function bishop(ctx, pen) {
  ellipse(ctx, 0, -22, 16, 20, pen.fill, pen.ink, 4);
  line(ctx, [[5, -37], [-5, -17]], pen.shade, 4);
  collar(ctx, pen, -5, 32);
  body(ctx, pen, 0, 30, 19);
}

function queen(ctx, pen) {
  crown(ctx, pen, -27);
  body(ctx, pen, -13, 30, 22);
  line(ctx, [[-18, -4], [18, -4]], pen.shade, 3);
}

function king(ctx, pen) {
  roundedRect(ctx, -5, -48, 10, 27, 3);
  paint(ctx, pen.fill, pen.ink, 3);
  roundedRect(ctx, -14, -42, 28, 9, 3);
  paint(ctx, pen.fill, pen.ink, 3);
  polygon(ctx, KING_CROWN, pen.fill, pen.ink, 4);
  body(ctx, pen, -10, 30, 22);
}

const KINDS = { p: pawn, r: rook, n: knight, b: bishop, q: queen, k: king };

export function drawPiece(ctx, theme, piece, x, y, size, { alpha = 1, rim = null } = {}) {
  const kind = typeof piece === "string" ? KINDS[piece.toLowerCase()] : null;
  if (!kind) return;
  const side = piece === piece.toUpperCase() ? 0 : 1;
  const pen = { side, ...theme.pieces[side], ink: theme.ink, jewel: theme.jewel };
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  withRim(ctx, { ink: theme.ink, colour: rim }, () => {
    kind(ctx, pen);
    base(ctx, pen);
  });
  ctx.restore();
}

function kingMarkup(side, { fill, shade, band }) {
  const outline = [
    '<rect x="-5" y="-48" width="10" height="27" rx="3"/>',
    '<rect x="-14" y="-42" width="28" height="9" rx="3"/>',
    `<polygon points="${KING_CROWN.join(" ")}"/>`,
    '<path d="M-10 -10C-10 4 -22 23 -26 30Q0 37 26 30C22 23 10 4 10 -10Z"/>',
    side === 0 ? '<rect x="-32" y="31" width="64" height="15" rx="7"/>' : `<polygon points="${HEXAGON.join(" ")}"/>`,
  ].join("");
  const lines = `<path d="M-23 36H23" stroke="${shade}" stroke-width="3"/>${band ? `<path d="M-18 43H18" stroke="${band}" stroke-width="2"/>` : ""}`;
  const rim = side === 1 ? `<g class="ftc-rim" fill="none" stroke-width="10">${outline}</g>` : "";
  return `${rim}<g fill="${fill}" stroke="${ART.ink}" stroke-width="3.5">${outline}${lines}</g>`;
}

export function sideMark(side) {
  return `<svg class="ftc-side" viewBox="-52 -54 104 104" aria-hidden="true" stroke-linejoin="round" stroke-linecap="round">${kingMarkup(side, ART.pieces[side])}</svg>`;
}
