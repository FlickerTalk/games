import { EXPRESSIONS } from "./cast.js";
import { CREAM, INK, TAU, circle, ellipse, line, paint } from "./pen.js";

export const MINT = "#A9F4E6";
const TONGUE = "#FF6B54";
const EYE_Y = -5;
const EYES_X = [-14, 14];

function blink(time, phase) {
  const at = (((time + phase) % 4.6) + 4.6) % 4.6;
  if (at < 4.4) return 1;
  return Math.max(0.08, Math.abs(((at - 4.4) / 0.2) * 2 - 1));
}

function openEye(ctx, x, colour, squash, radius) {
  ctx.save();
  ctx.translate(x, EYE_Y);
  ctx.scale(1, squash);
  circle(ctx, 0, 0, radius, colour, null);
  ctx.restore();
}

function closedEye(ctx, x, colour, low) {
  ctx.beginPath();
  if (low) ctx.arc(x, EYE_Y, 6, 0.12, Math.PI - 0.12);
  else ctx.arc(x, EYE_Y, 6, Math.PI + 0.12, TAU - 0.12);
  paint(ctx, null, colour, 3);
}

function eyes(ctx, expression, colour, squash) {
  if (["happy", "laughing", "cheering", "sleepy"].includes(expression)) {
    for (const x of EYES_X) closedEye(ctx, x, colour, expression === "sleepy");
  } else if (expression === "dizzy") {
    for (const x of EYES_X) {
      line(ctx, [[x - 4, EYE_Y - 4], [x + 4, EYE_Y + 4]], colour, 3);
      line(ctx, [[x + 4, EYE_Y - 4], [x - 4, EYE_Y + 4]], colour, 3);
    }
  } else {
    const look = expression === "thinking" ? 2 : expression === "oops" ? -1.5 : 0;
    const wide = expression === "surprised";
    for (const x of EYES_X) openEye(ctx, x + look, colour, wide ? 1.35 : squash, wide ? 3.8 : 3.2);
  }
}

function raised(ctx, colour) {
  ctx.beginPath();
  ctx.arc(-14, -12, 8, Math.PI + 0.25, TAU - 0.25);
  ctx.arc(14, -12, 8, Math.PI + 0.25, TAU - 0.25);
  paint(ctx, null, colour, 2.5);
}

const BROWS = {
  focused: [[[-21, -15], [-8, -11]], [[8, -11], [21, -15]], 3],
  determined: [[[-21, -15], [-8, -11]], [[8, -11], [21, -15]], 3],
  confident: [[[-20, -13], [-9, -15]], [[8, -17], [20, -14]], 2.7],
  thinking: [[[-21, -14], [-9, -15]], [[8, -12], [20, -16]], 2.5],
};

function lifted(ctx, colour) {
  for (const x of EYES_X) {
    ctx.beginPath();
    ctx.arc(x, -15, 6, Math.PI + 0.5, TAU - 0.5);
    paint(ctx, null, colour, 2.5);
  }
}

function brows(ctx, expression, colour) {
  if (expression === "surprised" || expression === "oops") return raised(ctx, colour);
  if (expression === "cheering") return lifted(ctx, colour);
  if (!Object.hasOwn(BROWS, expression)) return;
  const [left, right, width] = BROWS[expression];
  line(ctx, left, colour, width);
  line(ctx, right, colour, width);
}

function smile(ctx, colour, { open = false, large = false, robot = false } = {}) {
  if (!open) {
    ctx.beginPath();
    ctx.arc(0, 7, large ? 13 : 10, 0.15, Math.PI - 0.15);
    paint(ctx, null, colour, 3.2);
    return;
  }
  const edge = large ? 15 : 12;
  ctx.beginPath();
  ctx.moveTo(-edge, 7);
  ctx.quadraticCurveTo(0, large ? 31 : 26, edge, 7);
  ctx.quadraticCurveTo(0, 12, -edge, 7);
  paint(ctx, colour, colour, 2.5);
  if (robot) return;
  ctx.beginPath();
  ctx.moveTo(-9, 9);
  ctx.quadraticCurveTo(0, 13, 9, 9);
  ctx.lineTo(8, 13);
  ctx.quadraticCurveTo(0, 16, -8, 13);
  ctx.closePath();
  paint(ctx, CREAM, null);
  ellipse(ctx, 0, large ? 23 : 20, large ? 6 : 5, 3, TONGUE, null);
}

function stroke(ctx, colour, path) {
  ctx.beginPath();
  path(ctx);
  paint(ctx, null, colour, 3);
}

const MOUTHS = {
  neutral: (ctx, colour) => smile(ctx, colour),
  happy: (ctx, colour, robot) => smile(ctx, colour, { open: true, robot }),
  laughing: (ctx, colour, robot) => smile(ctx, colour, { open: true, large: true, robot }),
  cheering: (ctx, colour, robot) => smile(ctx, colour, { open: true, large: true, robot }),
  surprised: (ctx, colour) => ellipse(ctx, 0, 14, 5, 7, colour, null),
  sleepy: (ctx, colour) => ellipse(ctx, 0, 14, 4, 5, colour, null),
  focused: (ctx, colour) => line(ctx, [[-7, 14], [8, 14]], colour, 3),
  determined: (ctx, colour) => line(ctx, [[-7, 14], [8, 12]], colour, 3),
  dizzy: (ctx, colour) =>
    stroke(ctx, colour, (path) => {
      path.moveTo(-10, 15);
      path.bezierCurveTo(-5, 8, 0, 22, 6, 14);
      path.quadraticCurveTo(9, 11, 11, 15);
    }),
  confident: (ctx, colour) =>
    stroke(ctx, colour, (path) => {
      path.moveTo(-7, 13);
      path.quadraticCurveTo(3, 20, 12, 9);
    }),
  thinking(ctx, colour) {
    line(ctx, [[-5, 15], [7, 13]], colour, 3);
    circle(ctx, 29, 12, 2.2, colour, null);
    circle(ctx, 34, 6, 1.5, colour, null);
  },
  oops: (ctx, colour) =>
    stroke(ctx, colour, (path) => {
      path.moveTo(-9, 14);
      path.quadraticCurveTo(-2, 8, 4, 14);
      path.quadraticCurveTo(8, 18, 12, 12);
    }),
};

export function drawExpression(ctx, expression, { time = 0, phase = 0, robot = false } = {}) {
  const face = EXPRESSIONS.includes(expression) ? expression : "neutral";
  const ink = robot ? MINT : INK;
  eyes(ctx, face, ink, blink(time, phase));
  brows(ctx, face, ink);
  MOUTHS[face](ctx, ink, robot);
}
