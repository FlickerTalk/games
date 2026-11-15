import { CREAM, INK, circle, line, paint, polygon, roundedRect } from "./pen.js";

const CAP = "#4F9BE8";
const SEAM = "#263858";
const TIE = "#FF6B54";

function puff(ctx, x, y, radius, colour) {
  circle(ctx, x, y, radius, colour, INK, 3.2);
  circle(ctx, x - radius * 0.35, y - radius * 0.25, radius * 0.42, colour, INK, 2);
  circle(ctx, x + radius * 0.32, y - radius * 0.18, radius * 0.38, colour, INK, 2);
}

function long(ctx, colour, swing) {
  ctx.beginPath();
  ctx.moveTo(-35, -26);
  ctx.bezierCurveTo(-50, -12, -46 + swing, 30, -38 + swing, 43);
  ctx.quadraticCurveTo(-20, 51, -12, 38);
  ctx.lineTo(14, 38);
  ctx.quadraticCurveTo(25, 51, 39 + swing, 42);
  ctx.bezierCurveTo(48 + swing, 24, 49, -13, 34, -29);
  ctx.closePath();
  paint(ctx, colour, INK, 3.4);
}

function waves(ctx, colour, swing) {
  long(ctx, colour, swing);
  line(ctx, [[-40, 3], [-34, 10], [-40, 18], [-34, 26], [-39, 34]], INK, 2.1);
  line(ctx, [[39, 2], [33, 10], [40, 18], [34, 27], [39, 34]], INK, 2.1);
}

function bob(ctx, colour) {
  ctx.beginPath();
  ctx.moveTo(-36, -27);
  ctx.bezierCurveTo(-49, -10, -45, 19, -36, 29);
  ctx.quadraticCurveTo(-25, 35, -18, 26);
  ctx.lineTo(20, 26);
  ctx.quadraticCurveTo(28, 35, 38, 28);
  ctx.bezierCurveTo(48, 11, 46, -15, 34, -29);
  ctx.closePath();
  paint(ctx, colour, INK, 3.4);
}

function ponytail(ctx, colour, swing) {
  ctx.save();
  ctx.translate(31, -31);
  ctx.rotate(0.25 + swing * 0.025);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(20, -8, 28, 7, 20, 22);
  ctx.bezierCurveTo(15, 34, 22, 42, 11, 47);
  ctx.bezierCurveTo(1, 36, 7, 23, 1, 15);
  ctx.closePath();
  paint(ctx, colour, INK, 3.4);
  ctx.restore();
}

function braids(ctx, colour, swing) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 34, 12);
    ctx.rotate(side * swing * 0.018);
    for (let link = 0; link < 3; link += 1) circle(ctx, side * (link % 2 ? 2 : -1), link * 10, 8 - link * 0.8, colour, INK, 2.7);
    polygon(ctx, [[-5, 25], [5, 25], [0, 34]], colour, INK, 2.6);
    ctx.restore();
  }
}

function oneBraid(ctx, colour, swing) {
  ctx.save();
  ctx.translate(35, 13);
  ctx.rotate(swing * 0.018);
  for (let link = 0; link < 4; link += 1) circle(ctx, link % 2 ? 2 : -2, link * 9, 8 - link * 0.8, colour, INK, 2.6);
  polygon(ctx, [[-4, 30], [5, 30], [0, 40]], colour, INK, 2.5);
  ctx.restore();
}

const BACK = {
  "long-fringe": long,
  "wavy-headband": waves,
  bob,
  ponytail,
  braids,
  "long-braid": oneBraid,
  bun: (ctx, colour, swing) => puff(ctx, swing * 0.3, -45, 15, colour),
  "curly-puff": (ctx, colour, swing) => puff(ctx, swing * 0.25, -45, 20, colour),
  "two-puffs"(ctx, colour, swing) {
    puff(ctx, -32 + swing * 0.15, -35, 16, colour);
    puff(ctx, 32 + swing * 0.15, -35, 16, colour);
  },
};

export function drawHairBack(ctx, hair, colour, { time = 0, motion = 0 } = {}) {
  if (!Object.hasOwn(BACK, hair)) return;
  BACK[hair](ctx, colour, Math.sin(time * 3.1) * (1.2 + Math.abs(motion) * 2) + motion * 4);
}

function cap(ctx, colour) {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 36, -17);
    ctx.quadraticCurveTo(side * 43, -3, side * 34, 8);
    ctx.lineTo(side * 27, -5);
    ctx.closePath();
    paint(ctx, colour, INK, 3);
  }
  ctx.beginPath();
  ctx.moveTo(-38, -25);
  ctx.quadraticCurveTo(-31, -49, 0, -48);
  ctx.quadraticCurveTo(31, -49, 38, -25);
  ctx.closePath();
  paint(ctx, CAP, INK, 3.4);
  ctx.beginPath();
  ctx.moveTo(-4, -26);
  ctx.quadraticCurveTo(25, -31, 47, -19);
  ctx.quadraticCurveTo(28, -14, -4, -19);
  ctx.closePath();
  paint(ctx, CAP, INK, 3.2);
  line(ctx, [[0, -46], [0, -27]], SEAM, 2);
}

function spiky(ctx, colour) {
  polygon(
    ctx,
    [[-39, -17], [-43, -36], [-29, -31], [-28, -48], [-15, -38], [-5, -53], [4, -39], [19, -51], [20, -35], [39, -41], [35, -18], [21, -25], [8, -20], [-6, -28], [-20, -20]],
    colour,
    INK,
    3.4,
  );
}

function messy(ctx, colour) {
  ctx.beginPath();
  ctx.moveTo(-39, -14);
  ctx.quadraticCurveTo(-44, -35, -19, -43);
  ctx.quadraticCurveTo(9, -51, 36, -34);
  for (const [x, y] of [[41, -16], [28, -23], [20, -12], [8, -25], [-4, -13], [-15, -26], [-27, -12]]) ctx.lineTo(x, y);
  ctx.closePath();
  paint(ctx, colour, INK, 3.4);
}

function undercut(ctx, colour, swing) {
  ctx.beginPath();
  ctx.moveTo(-36, -18);
  ctx.quadraticCurveTo(-34, -34, -20, -38);
  ctx.lineTo(-18, -20);
  ctx.quadraticCurveTo(-28, -15, -36, -18);
  paint(ctx, colour, INK, 3);
  ctx.beginPath();
  ctx.moveTo(-18, -25);
  ctx.bezierCurveTo(-19, -47, 12, -54, 37 + swing, -37);
  ctx.bezierCurveTo(23, -27, 6, -25, -18, -25);
  paint(ctx, colour, INK, 3.4);
  line(ctx, [[-29, -29], [-23, -26]], CREAM, 1.8);
}

function twists(ctx, colour, swing) {
  ctx.beginPath();
  ctx.moveTo(-38, -20);
  ctx.quadraticCurveTo(-39, -40, 0, -43);
  ctx.quadraticCurveTo(39, -40, 38, -20);
  ctx.lineTo(29, -17);
  ctx.quadraticCurveTo(0, -29, -30, -17);
  ctx.closePath();
  paint(ctx, colour, INK, 3.2);
  for (let twist = -3; twist <= 3; twist += 1) {
    ctx.save();
    ctx.translate(twist * 10, -37 - (3 - Math.abs(twist)) * 1.5);
    ctx.rotate(twist * 0.08 + swing * 0.01);
    roundedRect(ctx, -3.5, -10, 7, 17, 3.5);
    paint(ctx, colour, INK, 2.4);
    ctx.restore();
  }
}

function curls(ctx, colour) {
  for (let curl = 0; curl < 7; curl += 1) {
    const angle = Math.PI + (curl * Math.PI) / 6;
    circle(ctx, Math.cos(angle) * 34, -10 + Math.sin(angle) * 31, 11, colour, INK, 2.8);
  }
  circle(ctx, 0, -37, 14, colour, INK, 2.8);
}

const fringe = (ctx) => {
  ctx.lineTo(31, -15);
  ctx.quadraticCurveTo(23, -21, 18, -13);
  ctx.lineTo(12, -23);
  ctx.quadraticCurveTo(4, -15, -2, -22);
  ctx.lineTo(-9, -13);
  ctx.quadraticCurveTo(-17, -23, -22, -17);
  ctx.lineTo(-30, -12);
};

const EDGES = {
  "long-fringe": fringe,
  braids: fringe,
  "long-braid": fringe,
  "wavy-headband": fringe,
  "side-part"(ctx, swing) {
    ctx.quadraticCurveTo(31, -28, 7 + swing, -20);
    ctx.quadraticCurveTo(-10, -14, -24, -25);
    ctx.quadraticCurveTo(-29, -14, -39, -15);
  },
  quiff(ctx, swing) {
    ctx.lineTo(32, -20);
    ctx.bezierCurveTo(42 + swing, -42, 17, -59, -5, -43);
    ctx.quadraticCurveTo(-24, -28, -39, -15);
  },
  ponytail(ctx) {
    ctx.quadraticCurveTo(24, -27, 8, -22);
    ctx.quadraticCurveTo(-12, -16, -27, -25);
    ctx.lineTo(-39, -15);
  },
  bob(ctx) {
    ctx.lineTo(35, -10);
    ctx.quadraticCurveTo(20, -18, 12, -30);
    ctx.quadraticCurveTo(-2, -16, -27, -22);
    ctx.lineTo(-39, -15);
  },
};

function crop(ctx) {
  ctx.quadraticCurveTo(28, -23, 15, -25);
  ctx.quadraticCurveTo(0, -18, -14, -25);
  ctx.quadraticCurveTo(-28, -20, -39, -15);
}

function dome(ctx, hair, colour, swing) {
  ctx.beginPath();
  ctx.moveTo(-39, -15);
  ctx.bezierCurveTo(-43, -34, -25, -45, 0, -44);
  ctx.bezierCurveTo(25, -45, 42, -34, 39, -14);
  (Object.hasOwn(EDGES, hair) ? EDGES[hair] : crop)(ctx, swing);
  ctx.closePath();
  paint(ctx, colour, INK, 3.4);
  if (hair === "ponytail") {
    roundedRect(ctx, 26, -37, 9, 12, 3);
    paint(ctx, TIE, INK, 2.3);
  } else if (hair === "wavy-headband") {
    ctx.beginPath();
    ctx.moveTo(-36, -25);
    ctx.quadraticCurveTo(0, -42, 36, -25);
    paint(ctx, null, INK, 7);
    paint(ctx, null, TIE, 3.5);
  } else if (hair === "side-part") {
    line(ctx, [[-17, -38], [-8, -26]], CREAM, 2);
  }
}

const FRONT = { cap, spiky, "messy-fringe": messy, undercut, "mini-twists": twists, curls };

const DOMED = new Set(["long-fringe", "ponytail", "braids", "long-braid", "bun", "bob", "curly-puff", "two-puffs", "wavy-headband", "short-crop", "side-part", "quiff"]);

export function drawHairFront(ctx, hair, colour, { time = 0, motion = 0 } = {}) {
  const swing = Math.sin(time * 3.4) * (0.5 + Math.abs(motion)) + motion * 1.5;
  if (Object.hasOwn(FRONT, hair)) FRONT[hair](ctx, colour, swing);
  else if (DOMED.has(hair)) dome(ctx, hair, colour, swing);
}
