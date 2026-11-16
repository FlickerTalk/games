import { TAU, circle, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { bubbles } from "./sea-effects.js";

const SCOUT = 0;
const TWIN = 1;
const HEAVY = 2;
const RAY = 3;
const SPHERE = 4;
const HUNTER = 5;
const CARRIER = 6;
const RACER = 7;

function rounded(ctx, wide, top) {
  ctx.moveTo(0, top);
  ctx.bezierCurveTo(wide, top + 15, wide + 4, 5, wide, 29);
  ctx.quadraticCurveTo(wide - 2, 43, 0, 46);
  ctx.quadraticCurveTo(-wide + 2, 43, -wide, 29);
  ctx.bezierCurveTo(-wide - 4, 5, -wide, top + 15, 0, top);
}

function hullPath(ctx, type) {
  ctx.beginPath();
  if (type === RAY) {
    ctx.moveTo(0, -47);
    ctx.bezierCurveTo(16, -27, 47, -20, 48, 2);
    ctx.quadraticCurveTo(25, 30, 13, 42);
    ctx.lineTo(-13, 42);
    ctx.quadraticCurveTo(-25, 30, -48, 2);
    ctx.bezierCurveTo(-47, -20, -16, -27, 0, -47);
  } else if (type === SPHERE) ctx.arc(0, 0, 38, 0, TAU);
  else if (type === HUNTER) [[0, -54], [20, -16], [17, 35], [0, 45], [-17, 35], [-20, -16]].forEach(([x, y], at) => (at ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  else if (type === CARRIER) roundedRect(ctx, -39, -38, 78, 80, 25);
  else rounded(ctx, type === HEAVY ? 31 : type === RACER ? 27 : 23, type === RACER ? -39 : -49);
  ctx.closePath();
}

function headlights(ctx, colour, time) {
  ctx.save();
  ctx.globalAlpha *= 0.1 + Math.sin(time * 1.2) * 0.015;
  for (const side of [-1, 1]) polygon(ctx, [[side * 13, -37], [side * 32, -84], [0, -84], [side * 3, -39]], colour);
  ctx.restore();
}

function propeller(ctx, look, time, still) {
  ellipse(ctx, 0, 43, 14, 7, look.steelDark, look.ink, 3);
  ctx.save();
  ctx.translate(0, 47);
  ctx.rotate(still ? 0.4 : time * 7);
  ellipse(ctx, 0, 0, 18, 4, look.steel, look.ink, 2);
  ellipse(ctx, 0, 0, 4, 15, look.steel, look.ink, 2);
  ctx.restore();
  circle(ctx, 0, 47, 4, look.amber, look.ink, 2);
}

function details(ctx, look, type, [, light, dark]) {
  if (type === TWIN) {
    for (const side of [-1, 1]) {
      ellipse(ctx, side * 20, 0, 15, 42, dark, look.ink, 3);
      line(ctx, [[side * 20, -27], [side * 20, 28]], light, 4);
    }
  } else if (type === SPHERE) {
    for (const side of [-1, 1]) {
      line(ctx, [[side * 31, 17], [side * 49, 32], [side * 45, 43]], look.steel, 6);
      circle(ctx, side * 45, 43, 5, look.coral, look.ink, 2);
    }
  } else if (type === CARRIER) {
    for (const side of [-1, 1]) {
      roundedRect(ctx, side * 40.5 - 7.5, -5, 15, 35, 6);
      paint(ctx, dark, look.ink, 3);
    }
  }
}

export const cockpitOf = (hull) => [0, hull === SPHERE ? -0.05 : -0.14];

export function drawCraft(ctx, x, y, size, hull, look, { seat = 0, time = 0, bank = 0, caught = false } = {}) {
  const type = hull >= SCOUT && hull <= RACER ? Math.floor(hull) : SCOUT;
  const colours = caught ? look.dimmed : look.bodies[seat];
  ctx.save();
  ctx.translate(x, y + (caught ? Math.cos(time * 1.2) * 3 : Math.sin(time * 2) * 1.2));
  ctx.rotate(bank * 0.15 + (caught ? Math.sin(time * 1.5) * 0.08 : 0));
  ctx.scale(size / 100, size / 100);
  if (caught) ctx.globalAlpha *= 0.8 + Math.sin(time * TAU * 1.5) * 0.12;
  else headlights(ctx, colours[1], time);
  bubbles(ctx, 0, 58, 48, time, 4, colours[1]);
  propeller(ctx, look, time, caught);
  if (type !== TWIN && type !== RAY) for (const side of [-1, 1]) polygon(ctx, [[side * 17, 5], [side * 35, 25], [side * 17, 22]], colours[2], look.ink, 3);
  hullPath(ctx, type);
  paint(ctx, colours[0], look.ink, 3.5);
  if (type !== TWIN) {
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ellipse(ctx, -8, 4, 7, 30, colours[1]);
    ctx.restore();
  }
  details(ctx, look, type, colours);
  for (const side of [-1, 1]) circle(ctx, side * 12, -35, 4, caught ? look.steelDark : look.white, look.ink, 2);
  ctx.restore();
}
