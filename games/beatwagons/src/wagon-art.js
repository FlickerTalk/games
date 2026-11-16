import { TAU, circle, ellipse, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { beatsOf, kindOf } from "./train.js";

export const SHAPES = Object.freeze(["circle", "square", "triangle", "diamond", "pentagon", "star", "heart", "moon"]);
const SIDES = { triangle: 3, diamond: 4, pentagon: 5 };
const BASE = 72;
const DOT_LEAST = 1.6;

function heartPath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.25, y + r * 0.15, x - r, y - r * 0.9, x - r * 0.42, y - r * 0.72);
  ctx.bezierCurveTo(x - r * 0.1, y - r * 0.62, x, y - r * 0.35, x, y - r * 0.25);
  ctx.bezierCurveTo(x, y - r * 0.35, x + r * 0.1, y - r * 0.62, x + r * 0.42, y - r * 0.72);
  ctx.bezierCurveTo(x + r, y - r * 0.9, x + r * 1.25, y + r * 0.15, x, y + r * 0.9);
  ctx.closePath();
}

function moonPath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 0.28, Math.PI * 1.72);
  ctx.bezierCurveTo(x + r * 0.2, y - r * 0.55, x + r * 0.2, y + r * 0.55, x + r * 0.72, y + r * 0.72);
  ctx.closePath();
}

export function shapePath(ctx, shape, x, y, r) {
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
  } else if (shape === "square") roundedRect(ctx, x - r * 0.82, y - r * 0.82, r * 1.64, r * 1.64, r * 0.18);
  else if (shape === "heart") heartPath(ctx, x, y, r);
  else if (shape === "moon") moonPath(ctx, x, y, r);
  else if (shape === "star") starPath(ctx, x, y, r, r * 0.48);
  else {
    const sides = SIDES[shape] ?? 5;
    const turn = shape === "diamond" ? 0 : -Math.PI / 2;
    ctx.beginPath();
    for (let side = 0; side < sides; side += 1) {
      const angle = turn + (side * TAU) / sides;
      if (side) ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      else ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    ctx.closePath();
  }
}

export function drawWheel(ctx, x, y, radius, art) {
  circle(ctx, x, y, radius, art.wheel.tire, art.ink, 3);
  circle(ctx, x, y, radius * 0.45, art.wheel.hub, art.ink, 2);
}

const INSTRUMENTS = [
  (ctx, light, art) => {
    line(ctx, [[-15, -9], [15, 9]], art.ink, 2.5);
    line(ctx, [[-15, 9], [15, -9]], art.ink, 2.5);
    circle(ctx, -15, -10, 3, light, art.ink, 1.5);
    circle(ctx, 15, -10, 3, light, art.ink, 1.5);
  },
  (ctx, light, art) => {
    ctx.beginPath();
    ctx.arc(0, -2, 12, Math.PI, 0);
    ctx.lineTo(15, 10);
    ctx.lineTo(-15, 10);
    ctx.closePath();
    paint(ctx, light, art.ink, 2.5);
    circle(ctx, 0, 13, 3, art.ink);
  },
  (ctx, light, art) => {
    roundedRect(ctx, -14, -3, 28, 13, 5);
    paint(ctx, light, art.ink, 2.5);
    line(ctx, [[3, -3], [3, 10]], art.ink, 2);
  },
  (ctx, light, art) => {
    line(ctx, [[0, 3], [0, 16]], art.ink, 5);
    ellipse(ctx, 0, -6, 10, 12, light, art.ink, 2.5);
    line(ctx, [[-6, -9], [6, -3]], art.ink, 2);
  },
  (ctx, light, art) => {
    line(ctx, [[-12, -10], [12, -10]], art.ink, 3);
    line(ctx, [[-8, -8], [-8, 12]], light, 5);
    line(ctx, [[0, -8], [0, 15]], light, 5);
    line(ctx, [[8, -8], [8, 10]], light, 5);
  },
  (ctx, light, art) => {
    line(ctx, [[-8, -7], [7, 8]], art.ink, 4);
    ellipse(ctx, -8, -8, 6, 4.5, light, art.ink, 2);
    ellipse(ctx, 8, 9, 6, 4.5, light, art.ink, 2);
  },
  (ctx, light, art) => {
    circle(ctx, 0, -1, 11, light, art.ink, 2.5);
    circle(ctx, 0, -1, 6, art.cream, art.ink, 2);
    for (let jingle = 0; jingle < 4; jingle += 1) circle(ctx, Math.cos((jingle * Math.PI) / 2 + 0.8) * 11, -1 + Math.sin((jingle * Math.PI) / 2 + 0.8) * 11, 2.6, art.jingle, art.ink, 1);
  },
  (ctx, light, art) => {
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(7, -11);
    ctx.lineTo(7, 11);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    paint(ctx, light, art.ink, 2.5);
    line(ctx, [[-9, 0], [-14, 0]], art.ink, 4);
  },
];

function beatDots(ctx, beats, scale, art) {
  if (beats < 2) return;
  const radius = Math.max(DOT_LEAST / scale, 3.2);
  const step = radius * 2.6;
  for (let dot = 0; dot < beats; dot += 1) circle(ctx, (dot - (beats - 1) / 2) * step, -42, radius, art.dot, art.white, Math.max(1, 1.2 / scale));
}

function chassis(ctx, fill, art) {
  roundedRect(ctx, -34, 13, 68, 15, 6);
  paint(ctx, fill, art.ink, 3);
  line(ctx, [[-42, 20], [-34, 20]], art.ink, 3);
  line(ctx, [[34, 20], [42, 20]], art.ink, 3);
  drawWheel(ctx, -21, 29, 8, art);
  drawWheel(ctx, 21, 29, 8, art);
}

export function drawWagon(ctx, x, y, size, wagon, { time = 0, hop = 0, wobble = 0, ghost = false } = {}, theme) {
  const { art } = theme;
  const kind = kindOf(wagon);
  const look = art.wagons[kind];
  const scale = size / BASE;
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.5;
  ctx.translate(x, y - Math.sin(Math.min(1, Math.max(0, hop)) * Math.PI) * size * 0.12);
  ctx.rotate(Math.sin(time * 20) * wobble * 0.13);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  chassis(ctx, look.body, art);
  shapePath(ctx, SHAPES[kind], 0, -7, 25);
  paint(ctx, look.body, art.ink, 3);
  ctx.save();
  ctx.translate(0, -6);
  INSTRUMENTS[kind](ctx, look.light, art);
  ctx.restore();
  beatDots(ctx, beatsOf(wagon), scale, art);
  ctx.restore();
}

export function drawGap(ctx, x, y, size, { time = 0, hint = null, faint = false } = {}, theme) {
  const { art } = theme;
  const scale = size / BASE;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.globalAlpha = faint ? 0.35 : 0.72 + Math.sin(time * 3) * 0.1;
  drawWheel(ctx, -21, 29, 8, art);
  drawWheel(ctx, 21, 29, 8, art);
  ctx.setLineDash([6, 5]);
  roundedRect(ctx, -34, 13, 68, 15, 6);
  paint(ctx, null, art.ink, 3);
  if (hint === null) roundedRect(ctx, -22, -31, 44, 44, 12);
  else shapePath(ctx, SHAPES[kindOf(hint)], 0, -7, 25);
  paint(ctx, null, art.ink, 3);
  ctx.setLineDash([]);
  if (hint !== null) beatDots(ctx, beatsOf(hint), scale, art);
  ctx.restore();
}
