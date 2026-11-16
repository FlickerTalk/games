import { circle, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

function engines(ctx, look, places, colour, time, dimmed) {
  for (const [x, y, scale = 1] of places) {
    const pulse = dimmed ? 0.35 : 0.9 + Math.sin(time * 6 + x) * 0.1;
    ellipse(ctx, x, y + 5 * pulse, 5 * scale, 10 * pulse * scale, look.glassDark);
    if (dimmed) continue;
    ellipse(ctx, x, y + 4 * pulse, 3 * scale, 7 * pulse * scale, colour);
    ellipse(ctx, x, y + 2, 1.5 * scale, 4 * pulse * scale, look.white);
  }
}

function lights(ctx, look, places, time, dimmed) {
  if (dimmed) return;
  ctx.save();
  ctx.globalAlpha = 0.65 + Math.sin(time * 2) * 0.2;
  places.forEach(([x, y], at) => circle(ctx, x, y, 1.8, at % 2 ? look.shotLight : look.white));
  ctx.restore();
}

const body = (ctx, look, points, fill, width = 3) => polygon(ctx, points, fill, look.ink, width);
const wings = (ctx, look, points, fill) => {
  body(ctx, look, points, fill, 2);
  body(ctx, look, points.map(([x, y]) => [-x, y]), fill, 2);
};

const HULLS = {
  fighter: {
    cockpit: -8,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[-9, 23], [9, 23]], c[1], time, dimmed);
      body(ctx, look, [[0, -35], [11, -15], [30, 16], [15, 13], [12, 27], [-12, 27], [-15, 13], [-30, 16], [-11, -15]], c[0]);
      body(ctx, look, [[0, -31], [7, 5], [0, 18], [-7, 5]], c[1], 2);
      wings(ctx, look, [[29, 16], [15, 5], [13, 16]], c[2]);
      lights(ctx, look, [[-25, 14], [25, 14]], time, dimmed);
    },
  },
  interceptor: {
    cockpit: -10,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[-7, 29], [7, 29]], c[1], time, dimmed);
      body(ctx, look, [[0, -39], [8, -15], [25, 22], [10, 16], [7, 31], [-7, 31], [-10, 16], [-25, 22], [-8, -15]], c[0]);
      body(ctx, look, [[0, -37], [4, 15], [0, 24], [-4, 15]], c[1], 2);
      wings(ctx, look, [[23, 20], [8, -7], [11, 18]], c[2]);
      lights(ctx, look, [[-20, 19], [20, 19]], time, dimmed);
    },
  },
  gunship: {
    cockpit: -6,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[-20, 22, 1.2], [20, 22, 1.2]], c[1], time, dimmed);
      body(ctx, look, [[0, -27], [17, -18], [31, -4], [30, 23], [12, 18], [0, 28], [-12, 18], [-30, 23], [-31, -4], [-17, -18]], c[0]);
      for (const side of [-1, 1]) {
        roundedRect(ctx, side * 23.5 - 7.5, -8, 15, 28, 4);
        paint(ctx, c[2], look.ink, 2);
        line(ctx, [[side * 27, -3], [side * 27, -17]], look.metalLight, 3);
      }
      body(ctx, look, [[0, -27], [13, -12], [10, 14], [-10, 14], [-13, -12]], c[1], 2);
      lights(ctx, look, [[-29, 16], [29, 16]], time, dimmed);
    },
  },
  scout: {
    cockpit: -6,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[0, 24, 1.15]], c[1], time, dimmed);
      body(ctx, look, [[0, -32], [10, -13], [27, -20], [20, 7], [11, 25], [0, 18], [-11, 25], [-20, 7], [-27, -20], [-10, -13]], c[0]);
      body(ctx, look, [[0, -28], [8, 7], [0, 16], [-8, 7]], c[1], 2);
      wings(ctx, look, [[24, -15], [13, -7], [18, 5]], c[2]);
      lights(ctx, look, [[-23, -15], [23, -15]], time, dimmed);
    },
  },
  delta: {
    cockpit: -4,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[-13, 20], [13, 20]], c[1], time, dimmed);
      body(ctx, look, [[0, -36], [34, 24], [12, 18], [0, 27], [-12, 18], [-34, 24]], c[0]);
      body(ctx, look, [[0, -31], [12, 15], [0, 21], [-12, 15]], c[1], 2);
      line(ctx, [[-28, 20], [0, -24], [28, 20]], c[2], 3);
      lights(ctx, look, [[-29, 20], [29, 20]], time, dimmed);
    },
  },
  twin: {
    cockpit: -4,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[-15, 26], [15, 26]], c[1], time, dimmed);
      body(ctx, look, [[-14, -31], [-4, -12], [-5, 24], [-25, 24], [-24, -8]], c[0]);
      body(ctx, look, [[14, -31], [24, -8], [25, 24], [5, 24], [4, -12]], c[0]);
      body(ctx, look, [[-24, 2], [24, 2], [19, 14], [-19, 14]], c[2], 2);
      body(ctx, look, [[0, -17], [9, -5], [7, 10], [-7, 10], [-9, -5]], c[1], 2);
      lights(ctx, look, [[-22, 19], [22, 19]], time, dimmed);
    },
  },
  lancer: {
    cockpit: -8,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[-8, 27], [8, 27]], c[1], time, dimmed);
      body(ctx, look, [[0, -40], [7, -18], [14, 5], [29, 12], [12, 17], [8, 29], [-8, 29], [-12, 17], [-29, 12], [-14, 5], [-7, -18]], c[0]);
      body(ctx, look, [[0, -38], [4, 18], [0, 25], [-4, 18]], c[1], 2);
      wings(ctx, look, [[27, 11], [11, 3], [15, 15]], c[2]);
      lights(ctx, look, [[-24, 11], [24, 11]], time, dimmed);
    },
  },
  ark: {
    cockpit: -5,
    draw(ctx, look, c, time, dimmed) {
      engines(ctx, look, [[-20, 22], [0, 26], [20, 22]], c[1], time, dimmed);
      body(ctx, look, [[0, -30], [22, -20], [33, 4], [25, 25], [7, 20], [0, 29], [-7, 20], [-25, 25], [-33, 4], [-22, -20]], c[0]);
      body(ctx, look, [[0, -26], [16, -13], [14, 13], [0, 22], [-14, 13], [-16, -13]], c[1], 2);
      wings(ctx, look, [[30, 3], [18, -8], [17, 14], [25, 20]], c[2]);
      lights(ctx, look, [[-28, 4], [28, 4], [0, 22]], time, dimmed);
    },
  },
};

export const HULL_NAMES = Object.freeze(Object.keys(HULLS));

const hullOf = (index) => HULLS[HULL_NAMES[index]] ?? HULLS.fighter;

// where the pilot's face sits, as a share of the craft's size from its centre
export const cockpitOf = (index) => [0, hullOf(index).cockpit / 64];

export function drawCraft(ctx, x, y, size, hull, look, { seat = 0, time = 0, bank = 0, caught = false } = {}) {
  ctx.save();
  ctx.translate(x, y + (caught ? Math.cos(time * 1.2) * 3 : Math.sin(time * 2) * 1.2));
  ctx.rotate(bank * 0.14 + (caught ? Math.sin(time * 1.5) * 0.08 : 0));
  ctx.scale(size / 64, size / 64);
  hullOf(hull).draw(ctx, look, caught ? look.dimmed : look.bodies[seat], time, caught);
  ctx.restore();
}
