import { TAU, circle, clamp, ease, ellipse, line, polygon } from "../../../../../kit/src/canvas/pen.js";
import { drawSeatMark } from "../marks.js";
import { bubbles } from "./effects.js";

const plate = (ctx, look, points, fill, width = 3) => polygon(ctx, points, fill, look.ink, width);

function eye(ctx, look, x, y, width, height, glow, turn = 1) {
  plate(ctx, look, [[x - width, y + turn * 2], [x, y - height], [x + width, y - turn * 2], [x, y + height]], glow, 2);
  line(ctx, [[x - 1, y - height * 0.65], [x + 1, y + height * 0.65]], look.ink, Math.max(2, height * 0.45));
  line(ctx, [[x - width - 2, y - height - 3], [x + width + 2, y - height - 1]], look.monsterDark, 4);
}

function spine(ctx, look, x, y, length, angle, fill = look.boneDark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  plate(ctx, look, [[-5, 3], [0, -length], [6, 3]], fill, 2);
  ctx.restore();
}

function claw(ctx, look, x, y, side, reach, fill = look.monsterLight) {
  const arm = [[x, y], [x + side * reach * 0.55, y + reach * 0.35], [x + side * reach, y + reach * 0.12]];
  line(ctx, arm, look.ink, 10);
  line(ctx, arm, fill, 5);
  plate(ctx, look, [arm[2], [x + side * (reach + 12), y - 3], [x + side * (reach - 2), y + reach * 0.35]], look.boneDark, 2);
}

function veins(ctx, look, points, glow) {
  line(ctx, points, look.ink, 5);
  line(ctx, points, glow, 2);
}

function rope(ctx, look, fill, width, rim) {
  ctx.lineCap = "round";
  ctx.strokeStyle = look.ink;
  ctx.lineWidth = width + rim;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
}

function darter(ctx, look, glow, time) {
  const tail = Math.sin(time * 4) * 7;
  plate(ctx, look, [[0, -54], [18, -20], [13, 26], [0, 45], [-13, 26], [-18, -20]], look.monsterGreen);
  for (const side of [-1, 1]) plate(ctx, look, [[side * 12, 16], [side * 35, 35 - side * tail], [side * 10, 29]], look.monsterDark);
  for (let at = 0; at < 4; at += 1) spine(ctx, look, 0, -4 + at * 12, 16 + at * 2, Math.PI);
  plate(ctx, look, [[0, -50], [10, -26], [0, -17], [-10, -26]], look.monsterLight, 2);
  eye(ctx, look, 0, -28, 7, 4, glow);
  veins(ctx, look, [[0, -10], [-5, 6], [2, 22], [0, 36]], glow);
}

function mite(ctx, look, glow) {
  for (const side of [-1, 1]) for (let at = 0; at < 3; at += 1) claw(ctx, look, side * (19 - at * 2), -1 + at * 13, side, 32 - at * 5);
  const lure = [[-8, -28], [-19, -52], [-4, -67], [9, -59]];
  line(ctx, lure, look.ink, 8);
  line(ctx, lure, look.monsterLight, 4);
  circle(ctx, 10, -58, 10, glow, look.ink, 3);
  plate(ctx, look, [[-26, -28], [2, -40], [29, -20], [25, 22], [0, 42], [-29, 19]], look.monsterPurple, 4);
  plate(ctx, look, [[-22, -20], [2, -30], [23, -15], [9, -2], [-16, 0]], look.monsterDark, 2);
  for (let at = 0; at < 5; at += 1) eye(ctx, look, -15 + at * 8, -12 + Math.abs(2 - at) * 3, 3, 2.5, glow);
  plate(ctx, look, [[-10, 8], [0, 3], [11, 9], [5, 31], [-4, 34]], look.deep, 2);
  line(ctx, [[-4, 12], [1, 28], [6, 13]], glow, 2);
}

function eel(ctx, look, glow, time) {
  const sway = Math.sin(time * 1.8) * 10;
  ctx.beginPath();
  ctx.moveTo(-35, 46);
  ctx.bezierCurveTo(48 + sway, 30, -50 - sway, -5, 23, -40);
  rope(ctx, look, look.monsterPurple, 20, 7);
  for (let at = 0; at < 7; at += 1) {
    const [x, y] = [Math.sin(at * 1.5 + time * 1.8) * 16, 35 - at * 11];
    line(ctx, [[x - 15, y - 4], [x, y + 2], [x + 15, y - 5]], look.boneDark, 5);
    circle(ctx, x, y + 1, 2.5, glow);
  }
  plate(ctx, look, [[8, -48], [33, -55], [48, -39], [30, -24], [9, -30]], look.monsterDark);
  plate(ctx, look, [[26, -29], [52, -22], [35, -39]], look.boneDark, 2);
  eye(ctx, look, 31, -43, 6, 3, glow);
}

function leech(ctx, look, glow, time) {
  for (let at = 0; at < 6; at += 1) {
    const [x, y] = [Math.sin(time * 2 + at * 0.7) * 8, -35 + at * 14];
    plate(ctx, look, [[x - 19 + at, y - 8], [x + 15 - at, y - 10], [x + 21 - at, y + 4], [x, y + 12], [x - 17 + at, y + 5]], at % 2 ? look.monsterDark : look.monsterGreen, 2);
    line(ctx, [[x - 9, y], [x + 10, y - 2]], glow, 2);
  }
  for (const side of [-1, 1]) claw(ctx, look, side * 9, -37, side, 22, look.boneDark);
  plate(ctx, look, [[-19, -40], [0, -58], [21, -39], [11, -20], [-12, -22]], look.monsterLight);
  polygon(ctx, [[0, -49], [12, -39], [0, -29], [-11, -39]], look.deep, glow, 2);
  for (let at = 0; at < 3; at += 1) spine(ctx, look, -9 + at * 9, -37, 8, at - 1, look.bone);
}

function stalker(ctx, look, glow, time) {
  const lit = Math.sin(time * 0.9) > 0.6 ? look.monsterDark : glow;
  for (const side of [-1, 1]) claw(ctx, look, side * 24, 8, side, 38, look.monsterGreen);
  plate(ctx, look, [[0, -53], [35, -28], [44, 13], [19, 45], [-20, 42], [-43, 9], [-32, -31]], look.monsterGreen, 4);
  for (let at = -1; at <= 1; at += 1) {
    const lift = Math.abs(at) * 7;
    plate(ctx, look, [[at * 23 - 13, -27 + lift], [at * 23 + 10, -34 + lift], [at * 23 + 17, 11], [at * 23 - 8, 18]], look.monsterLight);
  }
  plate(ctx, look, [[-27, -33], [0, -48], [29, -31], [18, -13], [-17, -12]], look.monsterDark);
  eye(ctx, look, 0, -27, 13, 4, lit);
  veins(ctx, look, [[-23, 21], [-7, 10], [0, 30], [15, 16], [26, 24]], lit);
}

function crawler(ctx, look, glow) {
  for (const side of [-1, 1]) for (let at = 0; at < 3; at += 1) claw(ctx, look, side * (24 - at * 4), -15 + at * 20, side, 33);
  plate(ctx, look, [[-33, -35], [4, -47], [37, -27], [31, 30], [4, 48], [-35, 28]], look.monsterGreen, 4);
  for (let at = 0; at < 4; at += 1) {
    plate(ctx, look, [[-28, -26 + at * 17], [0, -36 + at * 18], [29, -23 + at * 16], [18, -10 + at * 16], [-17, -9 + at * 16]], at % 2 ? look.monsterDark : look.monsterLight, 2);
  }
  for (let at = 0; at < 3; at += 1) eye(ctx, look, -12 + at * 12, -25 + (at % 2) * 4, 4, 3, glow);
  line(ctx, [[-18, 25], [0, 14], [19, 24]], glow, 3);
  spine(ctx, look, -23, -37, 19, -0.7);
  spine(ctx, look, 24, -34, 25, 0.65);
}

function gulper(ctx, look, glow, time) {
  plate(ctx, look, [[0, -50], [38, -24], [40, 25], [14, 48], [-24, 39], [-42, 4], [-30, -35]], look.monsterRust, 4);
  for (let at = 0; at < 3; at += 1) {
    ctx.save();
    ctx.rotate((at * TAU) / 3 + Math.sin(time) * 0.02);
    plate(ctx, look, [[-18, -5], [0, -38], [20, -6], [9, 9], [-8, 9]], look.monsterDark);
    for (let tooth = -1; tooth <= 1; tooth += 1) plate(ctx, look, [[tooth * 8 - 3, -7], [tooth * 8, -21], [tooth * 8 + 4, -6]], look.bone, 1);
    ctx.restore();
  }
  circle(ctx, 0, 0, 15, look.deep, glow, 3);
  eye(ctx, look, -19, -32, 5, 3, glow);
  eye(ctx, look, 18, -31, 5, 3, glow);
  veins(ctx, look, [[-29, 17], [-17, 26], [-8, 39]], glow);
}

function serpent(ctx, look, glow, time) {
  ctx.save();
  ctx.rotate(Math.sin(time * 0.8) * 0.08);
  ctx.beginPath();
  ctx.ellipse(-3, 4, 43, 48, 0.25, 0.2, TAU - 0.45);
  rope(ctx, look, look.monsterPurple, 18, 7);
  for (let at = 0; at < 8; at += 1) {
    const angle = 0.5 + at * 0.68;
    const [x, y] = [Math.cos(angle) * 41 - 3, Math.sin(angle) * 46 + 4];
    spine(ctx, look, x, y, 12, angle - Math.PI / 2);
    circle(ctx, x, y, 2.5, glow);
  }
  ctx.restore();
  ctx.save();
  ctx.translate(22, 22);
  ctx.rotate(0.35);
  plate(ctx, look, [[-18, -15], [7, -26], [27, -8], [18, 17], [-9, 21], [-24, 4]], look.monsterDark);
  plate(ctx, look, [[8, 10], [34, 21], [17, -1]], look.boneDark, 2);
  eye(ctx, look, 7, -8, 7, 4, glow);
  ctx.restore();
}

function volt(ctx, look, glow, time) {
  const charge = Math.sin(time * 2) > 0;
  for (let at = 0; at < 5; at += 1) {
    const [x, y] = [-32 + at * 16, -18 + Math.abs(2 - at) * 8];
    const height = 24 + (at % 2) * 15 + (charge ? 7 : 0);
    spine(ctx, look, x, y, height, -0.2 + at * 0.1);
    if (at < 4) line(ctx, [[x, -height - 10], [x + 7, -height - 18 + Math.sin(time * 8 + at) * 4], [x + 16, y - 28]], glow, charge ? 4 : 2);
  }
  plate(ctx, look, [[-47, -13], [-21, -38], [17, -35], [46, -8], [31, 28], [2, 49], [-30, 33]], look.monsterGreen, 4);
  for (let at = -1; at <= 1; at += 1) plate(ctx, look, [[at * 23 - 13, -17], [at * 23 + 9, -25], [at * 23 + 16, 16], [at * 23 - 5, 28]], look.monsterDark, 2);
  eye(ctx, look, 11, -15, 13, 5, glow);
  plate(ctx, look, [[-28, 15], [4, 6], [29, 17], [11, 36], [-15, 34]], look.deep);
  line(ctx, [[-17, 20], [-7, 30], [2, 17], [12, 29], [21, 18]], look.bone, 3);
  veins(ctx, look, [[-34, -4], [-17, 2], [-5, -7], [12, 1], [31, -5]], glow);
}

function brood(ctx, look, glow, time) {
  for (const side of [-1, 1]) {
    claw(ctx, look, side * 30, 16, side, 44, look.monsterPurple);
    line(ctx, [[side * 20, 29], [side * 29, 52], [side * 17, 65]], look.monsterDark, 8);
  }
  plate(ctx, look, [[0, -55], [35, -37], [47, 3], [27, 43], [0, 55], [-33, 39], [-47, 0], [-31, -40]], look.monsterPurple, 4);
  for (let at = 0; at < 7; at += 1) {
    const angle = (at * TAU) / 7;
    eye(ctx, look, Math.cos(angle) * 22, Math.sin(angle) * 20 - 10, 4, 3, glow, at % 2 ? 1 : -1);
  }
  for (let at = -1; at <= 1; at += 1) {
    const [x, drop] = [at * 23, (((time * 18 + at * 7) % 18) + 18) % 18];
    polygon(ctx, [[x - 9, 20 + drop], [x, 9 + drop], [x + 10, 21 + drop], [x + 5, 36 + drop], [x - 6, 35 + drop]], look.monsterDark, glow, 2);
    circle(ctx, x, 23 + drop, 3, glow);
  }
  plate(ctx, look, [[-13, -8], [0, -18], [14, -7], [7, 7], [-6, 8]], look.deep, 2);
}

function knight(ctx, look, glow) {
  for (const side of [-1, 1]) claw(ctx, look, side * 33, 5, side, 39, look.monsterRust);
  plate(ctx, look, [[-39, -38], [-8, -55], [31, -42], [49, -4], [31, 44], [-15, 51], [-49, 18]], look.monsterRust, 5);
  for (let at = 0; at < 3; at += 1) {
    const y = at * 22;
    plate(ctx, look, [[-35 + at * 7, -27 + y], [28 - at * 4, -34 + y], [37 - at * 6, -12 + y], [-26 + at * 3, -5 + y]], look.steelDark);
  }
  plate(ctx, look, [[-27, -44], [2, -59], [31, -39], [21, -16], [-21, -18]], look.monsterDark);
  spine(ctx, look, -20, -46, 29, -0.65);
  spine(ctx, look, 24, -40, 17, 0.9);
  eye(ctx, look, 1, -34, 15, 4, glow);
  veins(ctx, look, [[-28, 2], [-5, 10], [8, 1], [28, 12]], glow);
}

function wraith(ctx, look, glow, time) {
  const echo = Math.sin(time * 1.4) * 9;
  const body = [[0, -57], [37, -16], [24, 34], [0, 51], [-25, 33], [-39, -15]];
  ctx.save();
  ctx.globalAlpha *= 0.28;
  ctx.translate(echo - 13, -5);
  polygon(ctx, [[0, -54], [34, -11], [19, 43], [0, 29], [-20, 48], [-35, -8]], glow);
  ctx.restore();
  for (const side of [-1, 1]) {
    const limb = [[side * 19, 12], [side * 43, 36 + echo * 0.3], [side * 31, 58]];
    line(ctx, limb, look.ink, 9);
    line(ctx, limb, look.monsterLight, 5);
  }
  plate(ctx, look, body, look.monsterPurple, 4);
  plate(ctx, look, [[0, -47], [22, -13], [4, 34], [-8, 10]], look.glassDark, 2);
  plate(ctx, look, [[-29, -16], [-5, -34], [-9, 22], [-25, 30]], look.steelDark, 2);
  eye(ctx, look, 0, -18, 14, 4, glow);
  line(ctx, [[0, -5], [-8, 9], [3, 21], [0, 39]], glow, 3);
}

const MONSTERS = {
  scout: [{ draw: darter, glow: "cyan", wear: [[2, 4], [-2, 26]] }, { draw: mite, glow: "violet", wear: [[-15, 14], [16, 2]] }],
  weaver: [{ draw: eel, glow: "violet", wear: [[-1, 30], [-5, -14]] }, { draw: leech, glow: "cyan", wear: [[0, -8], [2, 20]] }],
  heavy: [{ draw: stalker, glow: "cyan", wear: [[-18, 25], [18, 0]] }, { draw: crawler, glow: "cyan", wear: [[-14, 30], [16, 8]] }],
  twin: [{ draw: gulper, glow: "violet", wear: [[-30, 0], [26, 24]] }, { draw: serpent, glow: "violet", wear: [[-45, -6], [9, -42]] }],
  gunner: [{ draw: volt, glow: "violet", wear: [[-30, 0], [30, 8]] }, { draw: brood, glow: "violet", wear: [[-34, 14], [30, -30]] }],
  elite: [{ draw: knight, glow: "cyan", wear: [[-2, 15], [24, -18]] }, { draw: wraith, glow: "cyan", wear: [[-14, 20], [12, -30]] }],
};

function wear(ctx, look, anchors, left) {
  const cracks = Math.min(anchors.length, Math.ceil((1 - clamp(left)) * 2));
  anchors.slice(0, cracks).forEach(([x, y], at) => {
    const side = at ? -1 : 1;
    line(ctx, [[x - side * 9, y - 14], [x + side * 3, y - 4], [x - side * 5, y + 6], [x + side * 8, y + 14]], look.deep, 4);
  });
}

function socket(ctx, look, glow, owner, left, time) {
  const colour = look.bodies[owner][0];
  circle(ctx, 0, 0, 40, look.monsterDark, look.ink, 5);
  circle(ctx, 0, 0, 30, look.deep, glow, 3);
  drawSeatMark(ctx, 0, 2, 34, owner, colour, look.ink, 2.5);
  ctx.setLineDash([12, 9]);
  ctx.lineDashOffset = -time * 9;
  ctx.beginPath();
  ctx.arc(0, 0, 49, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(left));
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawEnemy(ctx, x, y, size, kind, look, { time = 0, hit = 0, left = 1, owner = 0, variant = 0 } = {}) {
  const one = MONSTERS[kind]?.[Math.abs(variant) % 2] ?? MONSTERS.scout[0];
  ctx.save();
  ctx.translate(x + Math.sin(time * 0.8 + x * 0.01) * 1.5, y + Math.sin(time * 2 + x * 0.01) * 2);
  ctx.rotate(hit ? Math.sin(hit * Math.PI * 5) * 0.08 : 0);
  ctx.scale(size / 110, size / 110);
  if (kind === "core") socket(ctx, look, hit ? look.steelDark : look.violet, owner, left, time);
  else {
    one.draw(ctx, look, hit ? look.steelDark : look[one.glow], time);
    wear(ctx, look, one.wear, left);
  }
  if (hit) bubbles(ctx, 0, 20, 95, time, 6, look.glass);
  ctx.restore();
}

export function drawPop(ctx, x, y, size, kind, progress, look, time = 0) {
  const p = clamp(progress);
  const spread = 16 + ease(p) * 60;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 110, size / 110);
  ctx.globalAlpha *= 1 - p;
  if (p < 0.4) {
    ctx.save();
    ctx.globalAlpha *= 1 - p / 0.4;
    circle(ctx, 0, 0, 26 + p * 70, null, look[MONSTERS[kind]?.[0].glow ?? "violet"], 6);
    ctx.restore();
  }
  for (let at = 0; at < 6; at += 1) {
    const angle = (at * TAU) / 6 + 0.3;
    ctx.save();
    ctx.translate(Math.cos(angle) * spread, Math.sin(angle) * spread + p * p * 30);
    ctx.rotate(angle + time + p * 2);
    plate(ctx, look, [[-8, -5], [9, -7], [11, 5], [-5, 9]], [look.steelDark, look.monsterLight, look.boneDark][at % 3], 2);
    ctx.restore();
  }
  for (let at = 0; at < 6; at += 1) circle(ctx, Math.sin(at * 2.3) * (10 + spread * 0.6), -p * 80 - at * 7, 3 + (at % 3) * 1.5, null, look.glass, 2);
  ctx.restore();
}

function arm(ctx, look, points, width, tip, side) {
  const [start, one, two, end] = points;
  ctx.beginPath();
  ctx.moveTo(...start);
  ctx.bezierCurveTo(...one, ...two, ...end);
  rope(ctx, look, look.monsterPurple, width, 8);
  plate(ctx, look, [[end[0] - side * 8, end[1]], [end[0] + side * 13, end[1] - 18], [end[0] + side * 10, end[1] + 12]], look.boneDark, 2);
  circle(ctx, end[0] - side * 3, end[1] + 8, 3, tip);
}

function bossEye(ctx, look, width, opened, glow) {
  if (!opened) {
    line(ctx, [[-width, 0], [0, 5], [width, 0]], look.ink, 9);
    line(ctx, [[-width, -7], [0, -2], [width, -7]], look.boneDark, 5);
    return;
  }
  const lid = opened > 1 ? 0.45 : 0.2;
  plate(ctx, look, [[-width, 0], [0, -width * lid], [width, 0], [0, width * lid]], glow, 5);
  ellipse(ctx, 0, 0, width * 0.17, width * lid * 0.78, look.deep, look.ink, 2);
}

function holder(side, away, sway) {
  if (away) return [[side * 65, -75], [side * 150, -95], [side * 175, -25], [side * 142, 6]];
  return [[side * 65, -75], [side * 150, -85], [side * 135, 10 + sway], [side * 80, 0]];
}

export function drawBoss(ctx, x, y, reach, look, { time = 0, open = [false, false] } = {}) {
  const spent = open[0] && open[1];
  const glow = spent ? look.steelDark : look.violet;
  const sway = Math.sin(time * 1.2) * 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(reach / 80, reach / 80);
  [0, 1].forEach((seat) => arm(ctx, look, holder(seat ? 1 : -1, open[seat], seat ? sway : -sway), 25, open[seat] ? look.steelDark : glow, seat ? 1 : -1));
  for (const side of [-1, 1]) arm(ctx, look, [[side * 35, -45], [side * 85, 5], [side * 50, 75 - sway], [side * 92, 109]], 20, glow, side);
  for (const side of [-1, 1]) arm(ctx, look, [[side * 72, -105], [side * 126, -135 + sway], [side * 112, -158], [side * 146, -173]], 19, glow, side);
  ellipse(ctx, 0, -121, 84, 75, look.monsterPurple, look.ink, 6);
  plate(ctx, look, [[-75, -124], [-43, -169], [-10, -153], [24, -180], [72, -137], [60, -97], [-59, -94]], look.monsterDark, 4);
  for (let at = -2; at <= 2; at += 1) line(ctx, [[at * 22, -160 + Math.abs(at) * 7], [at * 18, -115]], look.monsterLight, 5);
  ctx.translate(0, -103);
  bossEye(ctx, look, 35, open.filter(Boolean).length, glow);
  ctx.restore();
}
