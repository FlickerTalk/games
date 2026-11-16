import { circle, ellipse, line, paint, polygon, roundedRect } from "../../../../../kit/src/canvas/pen.js";

function hover(ctx, look, width, time, dimmed) {
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.25 + Math.max(0, Math.sin(time * 17)) * 0.35 : 0.7;
  ellipse(ctx, 0, 24, width, 7, dimmed ? look.metal : look.shield);
  ellipse(ctx, 0, 24, width * 0.62, 3, look.white);
  ctx.restore();
  if (dimmed) return;
  for (let at = 0; at < 4; at += 1) {
    circle(ctx, Math.sin(time * 2 + at * 2.1) * width, 31 + ((time * 12 + at * 8) % 14), 2.5 - at * 0.3, look.dust);
  }
}

const body = (ctx, look, points, fill, width = 3) => polygon(ctx, points, fill, look.ink, width);
const pair = (ctx, look, points, fill) => [1, -1].forEach((side) => body(ctx, look, points.map(([x, y]) => [side * x, y]), fill, 2));

const HULLS = {
  skimmer: {
    cockpit: -9,
    draw(ctx, look, c) {
      body(ctx, look, [[0, -35], [17, -14], [25, 13], [13, 26], [-13, 26], [-25, 13], [-17, -14]], c[0]);
      body(ctx, look, [[0, -30], [10, -9], [8, 17], [0, 23], [-8, 17], [-10, -9]], c[1], 2);
      line(ctx, [[-19, 13], [-12, 20]], c[2], 4);
      line(ctx, [[19, 13], [12, 20]], c[2], 4);
    },
  },
  racer: {
    cockpit: -1,
    draw(ctx, look, c) {
      for (const side of [-1, 1]) {
        roundedRect(ctx, side * 16 - 9, -28, 18, 56, 8);
        paint(ctx, c[0], look.ink, 3);
        body(ctx, look, [[side * 16, -25], [side * 21, -12], [side * 11, -12]], c[1], 1.5);
      }
      body(ctx, look, [[-17, -4], [17, -4], [14, 14], [-14, 14]], c[2], 2);
    },
  },
  crawler: {
    cockpit: -10,
    draw(ctx, look, c) {
      body(ctx, look, [[0, -29], [25, -22], [33, -4], [29, 25], [12, 29], [0, 23], [-12, 29], [-29, 25], [-33, -4], [-25, -22]], c[0]);
      for (const side of [-1, 1]) {
        roundedRect(ctx, side * 25 - 8, -12, 16, 33, 4);
        paint(ctx, c[2], look.ink, 2);
        for (let y = -6; y < 17; y += 8) line(ctx, [[side * 25 - 5, y], [side * 25 + 5, y]], look.metalLight, 1.5);
      }
      body(ctx, look, [[0, -25], [15, -13], [12, 16], [-12, 16], [-15, -13]], c[1], 2);
    },
  },
  interceptor: {
    cockpit: -14,
    draw(ctx, look, c) {
      body(ctx, look, [[0, -40], [12, -10], [31, 19], [13, 14], [8, 28], [-8, 28], [-13, 14], [-31, 19], [-12, -10]], c[0]);
      body(ctx, look, [[0, -35], [7, -4], [4, 20], [-4, 20], [-7, -4]], c[1], 2);
      line(ctx, [[-25, 16], [-10, -5]], c[2], 4);
      line(ctx, [[25, 16], [10, -5]], c[2], 4);
    },
  },
  carrier: {
    cockpit: -10,
    wake: 31,
    draw(ctx, look, c, dimmed) {
      body(ctx, look, [[0, -28], [28, -21], [38, -4], [34, 24], [16, 28], [0, 22], [-16, 28], [-34, 24], [-38, -4], [-28, -21]], c[0]);
      body(ctx, look, [[0, -24], [20, -15], [22, 14], [0, 20], [-22, 14], [-20, -15]], c[1], 2);
      for (const side of [-1, 1]) {
        roundedRect(ctx, side * 29 - 7, -4, 14, 22, 4);
        paint(ctx, c[2], look.ink, 2);
        circle(ctx, side * 29, 5, 3, dimmed ? c[1] : look.white);
      }
    },
  },
  glider: {
    cockpit: -10,
    draw(ctx, look, c) {
      body(ctx, look, [[0, -34], [13, -12], [40, -22], [31, 7], [17, 23], [0, 18], [-17, 23], [-31, 7], [-40, -22], [-13, -12]], c[0]);
      body(ctx, look, [[0, -29], [10, 7], [0, 16], [-10, 7]], c[1], 2);
      pair(ctx, look, [[35, -17], [18, -7], [28, 3]], c[2]);
    },
  },
  striker: {
    cockpit: -9,
    draw(ctx, look, c) {
      body(ctx, look, [[0, -34], [19, -18], [25, 3], [18, 25], [0, 29], [-18, 25], [-25, 3], [-19, -18]], c[0]);
      body(ctx, look, [[0, -29], [12, -12], [9, 16], [0, 22], [-9, 16], [-12, -12]], c[1], 2);
      circle(ctx, -16, 10, 4, c[2], look.ink, 1.5);
      circle(ctx, 16, 10, 4, c[2], look.ink, 1.5);
    },
  },
  lancer: {
    cockpit: -8,
    draw(ctx, look, c) {
      body(ctx, look, [[0, -43], [8, -19], [14, 1], [29, 9], [15, 17], [9, 30], [-9, 30], [-15, 17], [-29, 9], [-14, 1], [-8, -19]], c[0]);
      body(ctx, look, [[0, -39], [5, 14], [0, 25], [-5, 14]], c[1], 2);
      line(ctx, [[0, -34], [0, 13]], look.white, 1.5);
    },
  },
};

const NAMES = Object.keys(HULLS);

const hullOf = (index) => HULLS[NAMES[index]] ?? HULLS.skimmer;

export const cockpitOf = (index) => [0, hullOf(index).cockpit / 64];

export function drawCraft(ctx, x, y, size, hull, look, { seat = 0, time = 0, bank = 0, caught = false } = {}) {
  const shape = hullOf(hull);
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 2) * (caught ? 0.3 : 1.5));
  ctx.rotate(bank * 0.15 + (caught ? Math.sin(time * 2) * 0.035 : 0));
  ctx.scale(size / 64, size / 64);
  hover(ctx, look, shape.wake ?? 23, time, caught);
  shape.draw(ctx, look, caught ? look.dimmed : look.bodies[seat], caught);
  ctx.restore();
}
