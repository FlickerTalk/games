import { CREAM, INK, TAU, circle, ellipse, line, paint, polygon } from "./pen.js";

const MINT = "#A9F4E6";
const WIDTH = 2.8;

function curve(ctx, start, curves, fill) {
  ctx.beginPath();
  ctx.moveTo(...start);
  for (const points of curves) ctx.bezierCurveTo(...points);
  paint(ctx, fill, INK, WIDTH);
}

const EMBLEMS = {
  sun(ctx) {
    circle(ctx, 0, 0, 5, CREAM, INK, WIDTH);
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (ray * TAU) / 8;
      line(ctx, [[Math.cos(angle) * 7, Math.sin(angle) * 7], [Math.cos(angle) * 10, Math.sin(angle) * 10]], INK, 2.2);
    }
  },
  wave(ctx) {
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.bezierCurveTo(-5, -7, 0, 8, 7, -2);
    ctx.bezierCurveTo(9, -5, 11, -4, 12, -2);
    paint(ctx, null, INK, 6);
    paint(ctx, null, CREAM, 2.5);
  },
  diamond(ctx) {
    polygon(ctx, [[0, -10], [9, 0], [0, 10], [-9, 0]], CREAM, INK, WIDTH);
    line(ctx, [[-8, 0], [8, 0]], INK, 1.8);
  },
  leaf(ctx) {
    curve(ctx, [-8, 7], [[-10, -6, 3, -12, 10, -9], [11, 2, 3, 11, -8, 7]], CREAM);
    line(ctx, [[-8, 9], [5, -5]], INK, 2);
  },
  moon(ctx) {
    curve(ctx, [5, -10], [[-9, -8, -11, 7, 3, 10], [-3, 4, -2, -4, 5, -10]], CREAM);
  },
  triangle(ctx) {
    polygon(ctx, [[0, -10], [10, 8], [-10, 8]], CREAM, INK, WIDTH);
    circle(ctx, 0, 3, 2, INK, null);
  },
  drop(ctx) {
    curve(ctx, [0, -11], [[3, -5, 10, 1, 8, 6], [5, 13, -7, 11, -8, 4], [-8, -1, -3, -6, 0, -11]], CREAM);
  },
  ring(ctx) {
    circle(ctx, 0, 0, 9, CREAM, INK, WIDTH);
    circle(ctx, 0, 0, 3.5, INK, null);
  },
  sprout(ctx) {
    line(ctx, [[0, 10], [0, -5]], INK, 3);
    ellipse(ctx, -5, -4, 5, 3, CREAM, INK, 2.2);
    ellipse(ctx, 5, -7, 5, 3, CREAM, INK, 2.2);
  },
  mountain(ctx) {
    polygon(ctx, [[-11, 8], [-2, -9], [3, 0], [7, -6], [12, 8]], CREAM, INK, WIDTH);
    line(ctx, [[-5, -3], [0, -1], [2, -4]], INK, 1.8);
  },
  flower(ctx) {
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal * TAU) / 5 - Math.PI / 2;
      circle(ctx, Math.cos(angle) * 6, Math.sin(angle) * 6, 4.3, CREAM, INK, 1.9);
    }
    circle(ctx, 0, 0, 3.2, CREAM, INK, 2);
  },
  spark(ctx) {
    polygon(ctx, [[0, -11], [3, -3], [10, 0], [3, 3], [0, 11], [-3, 3], [-10, 0], [-3, -3]], CREAM, INK, WIDTH);
  },
  bolt(ctx) {
    polygon(ctx, [[3, -11], [-7, 2], [-1, 2], [-4, 11], [8, -3], [2, -3]], MINT, INK, WIDTH);
  },
};

export function drawEmblem(ctx, emblem) {
  if (Object.hasOwn(EMBLEMS, emblem)) EMBLEMS[emblem](ctx);
}
