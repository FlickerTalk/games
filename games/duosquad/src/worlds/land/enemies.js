import { circle, clamp, ease, ellipse, line, paint, polygon, roundedRect } from "../../../../../kit/src/canvas/pen.js";
import { drawSeatMark } from "../marks.js";

function lamp(ctx, look, x, y, radius) {
  circle(ctx, x, y, radius + 3, look.iron, look.ink, 2);
  circle(ctx, x, y, radius, look.enemy, look.enemyLight, 2);
  circle(ctx, x - radius * 0.2, y - radius * 0.22, radius * 0.28, look.enemyCore);
}

const plate = (ctx, look, points, fill = look.bronze, width = 3) => polygon(ctx, points, fill, look.ink, width);
const cycle = (beat, rate) => (((beat * rate) % 1) + 1) % 1;

function feet(ctx, look, places) {
  for (const [x, y] of places) {
    line(ctx, [[x * 0.65, y * 0.45], [x, y]], look.ironLight, 6);
    roundedRect(ctx, x - 7, y - 3, 14, 8, 3);
    paint(ctx, look.bronze, look.ink, 2);
  }
}

function roller(ctx, look, beat) {
  ctx.rotate(beat * 0.5);
  circle(ctx, 0, 0, 27, look.iron, look.ink, 3);
  for (let at = 0; at < 8; at += 1) {
    const [a, b, c] = [0, -0.12, 0.12].map((turn) => (at * Math.PI) / 4 + turn);
    polygon(ctx, [[Math.cos(a) * 25, Math.sin(a) * 25], [Math.cos(b) * 34, Math.sin(b) * 34], [Math.cos(c) * 34, Math.sin(c) * 34]], look.bronze, look.ink, 1.5);
  }
  plate(ctx, look, [[-17, -12], [17, -12], [20, 10], [0, 21], [-20, 10]]);
  lamp(ctx, look, 0, 0, 8);
}

function saw(ctx, look, beat) {
  ctx.save();
  ctx.rotate(beat * 1.2);
  const teeth = Array.from({ length: 24 }, (_, at) => [Math.cos((at * Math.PI) / 12) * (at % 2 ? 27 : 36), Math.sin((at * Math.PI) / 12) * (at % 2 ? 27 : 36)]);
  polygon(ctx, teeth, look.bronzeLight, look.ink, 2);
  ctx.restore();
  circle(ctx, 0, 0, 23, look.iron, look.ink, 3);
  lamp(ctx, look, 0, 0, 9);
}

function hopper(ctx, look, beat) {
  const jump = Math.sin(beat * 3);
  const [lift, squash] = [Math.max(0, jump) * 5, Math.max(0, -jump) * 0.06];
  const reach = 26 + lift * 1.6;
  feet(ctx, look, [[-25, reach], [25, reach]]);
  ctx.save();
  ctx.translate(0, -lift);
  ctx.scale(1 + squash, 1 - squash);
  plate(ctx, look, [[0, -28], [23, -10], [18, 18], [0, 27], [-18, 18], [-23, -10]]);
  ctx.restore();
  for (const side of [-1, 1]) line(ctx, [[side * 14, 9 - lift], [side * 25, 23], [side * 20, reach + 6]], look.ironLight, 4);
  lamp(ctx, look, 0, -4 - lift, 8);
  line(ctx, [[-12, -17 - lift], [12, -17 - lift]], look.enemy, 3);
}

function burrower(ctx, look, beat) {
  const rise = (1 + Math.sin(beat * 1.6)) / 2;
  ctx.save();
  ctx.globalAlpha = 1 - rise * 0.7;
  ellipse(ctx, 0, 24, 35, 10, look.sand, look.ink, 2);
  ctx.restore();
  plate(ctx, look, [[0, -24 - rise * 15], [23, -10], [27, 17], [0, 30], [-27, 17], [-23, -10]]);
  for (const side of [-1, 1]) polygon(ctx, [[side * 14, -6], [side * 36, 4], [side * 25, 21]], look.ironLight, look.ink, 2);
  lamp(ctx, look, 0, 3, 9);
}

function walker(ctx, look, beat) {
  const step = Math.sin(beat * 2.4);
  const [left, right] = [31 + step * 6, 31 - step * 6];
  feet(ctx, look, [[-27, left], [27, right]]);
  ctx.save();
  ctx.rotate(step * 0.05);
  ctx.translate(0, -Math.abs(step) * 1.5);
  plate(ctx, look, [[0, -35], [25, -20], [23, 13], [0, 25], [-23, 13], [-25, -20]]);
  plate(ctx, look, [[-15, -23], [15, -23], [12, 4], [-12, 4]]);
  lamp(ctx, look, 0, -8, 8);
  ctx.restore();
  line(ctx, [[-17, 13], [-28, left - 3]], look.ironLight, 5);
  line(ctx, [[17, 13], [28, right - 3]], look.ironLight, 5);
}

function shielded(ctx, look, beat) {
  ctx.rotate(Math.sin(beat * 1.2) * 0.06);
  polygon(ctx, [[0, -31], [27, -14], [25, 20], [0, 30], [-25, 20], [-27, -14]], look.iron, look.ink, 3);
  ctx.save();
  ctx.globalAlpha = 0.75 + Math.sin(beat * 2) * 0.25;
  polygon(ctx, [[0, -36], [36, -18], [32, 20], [0, 35], [-32, 20], [-36, -18]], null, look.enemyLight, 5);
  ctx.restore();
  plate(ctx, look, [[-18, -18], [18, -18], [20, 13], [0, 24], [-20, 13]]);
  lamp(ctx, look, 0, 0, 8);
}

function drill(ctx, look, beat) {
  const whirr = cycle(beat, 0.4);
  plate(ctx, look, [[0, -34], [24, -15], [29, 23], [-29, 23], [-24, -15]]);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * 23 - 7, 3, 14, 26, 3);
    paint(ctx, look.ironLight, look.ink, 2);
  }
  ctx.save();
  ctx.translate(0, -34);
  ctx.rotate(whirr < 0.35 ? ease(whirr / 0.35) * Math.PI * 2 : 0);
  polygon(ctx, [[0, -25], [12, 3], [0, 12], [-12, 3]], look.metalLight, look.ink, 2);
  line(ctx, [[-7, -6], [7, -2]], look.iron, 2);
  ctx.restore();
  lamp(ctx, look, 0, 4, 8);
}

function turret(ctx, look, beat) {
  const rise = ease(Math.max(0, Math.sin(beat * 1.4))) * 12;
  ellipse(ctx, 0, 24, 33, 12, look.iron, look.ink, 3);
  plate(ctx, look, [[-23, 18], [-18, -9], [18, -9], [23, 18]]);
  roundedRect(ctx, -8, -36 - rise, 16, 38, 4);
  paint(ctx, look.ironLight, look.ink, 2);
  line(ctx, [[0, -33 - rise], [0, -42 - rise]], look.enemy, 5);
  lamp(ctx, look, 0, 5, 7);
}

function strider(ctx, look, beat) {
  const step = Math.sin(beat * 2.4);
  feet(ctx, look, [[-28, 32 + step * 4], [28, 32 - step * 4]]);
  ctx.rotate(step * 0.04);
  plate(ctx, look, [[0, -34], [28, -17], [24, 18], [0, 27], [-24, 18], [-28, -17]]);
  for (const side of [-1, 1]) {
    const pump = Math.max(0, Math.sin(beat * 3 + side)) * 11;
    roundedRect(ctx, side * 22 - 6, -28 - pump, 12, 36, 3);
    paint(ctx, look.ironLight, look.ink, 2);
    line(ctx, [[side * 22, -34 - pump], [side * 22, -41 - pump]], look.enemy, 4);
  }
  lamp(ctx, look, 0, 1, 9);
}

function factory(ctx, look, beat) {
  const chug = Math.max(0, Math.sin(beat * 4)) * 0.03;
  ctx.scale(1 + chug, 1 - chug);
  plate(ctx, look, [[0, -34], [31, -18], [35, 19], [17, 32], [-17, 32], [-35, 19], [-31, -18]]);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * 22 - 8, -5, 16, 25, 3);
    paint(ctx, look.iron, look.ink, 2);
    circle(ctx, side * 22, 6, 4, Math.sin(beat * 2 + side) > 0 ? look.enemy : look.ironLight);
  }
  polygon(ctx, [[-13, -20], [13, -20], [18, 15], [-18, 15]], look.ironLight, look.ink, 2);
  lamp(ctx, look, 0, -3, 9);
}

function magnet(ctx, look, beat) {
  ctx.rotate(Math.sin(beat * 0.9) * 0.12);
  polygon(ctx, [[0, -31], [25, -17], [27, 21], [0, 31], [-27, 21], [-25, -17]], look.iron, look.ink, 3);
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 15, -2, 16, (-side * Math.PI) / 2, (-side * Math.PI) / 2 + Math.PI);
    ctx.strokeStyle = look.bronzeLight;
    ctx.lineWidth = 9;
    ctx.stroke();
    circle(ctx, side * 15, -17, 4, look.enemyLight, look.ink, 1);
  }
  lamp(ctx, look, 0, 6, 8);
}

function cannon(ctx, look, beat) {
  const shot = cycle(beat, 0.35);
  const [jolt, out] = [Math.max(0, 1 - shot * 8), ease(shot) * 10];
  ctx.translate(0, jolt * 3);
  ctx.scale(1 + jolt * 0.05, 1 - jolt * 0.05);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * 25 - 8, -2, 16, 35, 4);
    paint(ctx, look.ironLight, look.ink, 2);
  }
  plate(ctx, look, [[0, -28], [24, -13], [24, 24], [-24, 24], [-24, -13]]);
  roundedRect(ctx, -10, -37 - out, 20, 48, 4);
  paint(ctx, look.ironLight, look.ink, 3);
  circle(ctx, 0, -35 - out, 6, look.enemy, look.ink, 2);
  lamp(ctx, look, 0, 9, 8);
}

function socket(ctx, look, owner, time, left) {
  const colour = look.bodies[owner][0];
  circle(ctx, 0, 0, 34, look.bronzeDark, look.ink, 3);
  circle(ctx, 0, 0, 26, look.iron, colour, 4);
  drawSeatMark(ctx, 0, owner ? 0 : 2, 28, owner, colour);
  ctx.globalAlpha = 0.4 + Math.sin(time * 3 + owner) * 0.12;
  ctx.beginPath();
  ctx.arc(0, 0, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(left));
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function wear(ctx, look, left) {
  const lit = Math.round(clamp(left) * 6);
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  for (let at = 0; at < 6; at += 1) {
    const from = -Math.PI / 2 + (at * Math.PI) / 3 + 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, 42, from, from + Math.PI / 3 - 0.28);
    ctx.strokeStyle = at < lit ? look.enemyLight : look.ironLight;
    ctx.stroke();
  }
}

const MACHINES = {
  scout: [roller, saw],
  weaver: [hopper, burrower],
  heavy: [shielded, drill],
  twin: [walker, strider],
  gunner: [turret, cannon],
  elite: [factory, magnet],
};

export function drawEnemy(ctx, x, y, size, kind, look, { time = 0, hit = 0, left = 1, owner = 0, variant = 0 } = {}) {
  ctx.save();
  ctx.translate(x + (hit ? Math.sin(hit * Math.PI * 5) * 3 : 0), y + Math.sin(time * 1.6 + x * 0.01) * 2);
  ctx.scale(size / 72, size / 72);
  ctx.save();
  if (kind === "core") socket(ctx, look, owner, time, left);
  else (MACHINES[kind] ?? MACHINES.scout)[variant % 2 ? 1 : 0](ctx, look, time + x * 0.01);
  ctx.restore();
  if (left < 1 && kind !== "core") wear(ctx, look, left);
  if (hit) {
    ctx.globalAlpha = Math.sin(clamp(hit) * Math.PI) * 0.55;
    circle(ctx, 0, 0, 30, look.shotLight);
  }
  ctx.restore();
}

const PIECES = { heavy: 8, twin: 8, elite: 9, core: 9 };

export function drawPop(ctx, x, y, size, kind, progress, look, time = 0) {
  const p = clamp(progress);
  const travel = size * ease(p) * 0.55;
  const count = PIECES[kind] ?? 7;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  if (p < 0.35) circle(ctx, x, y, size * 0.12 * (1 - p / 0.35), look.enemyCore);
  for (let at = 0; at < count; at += 1) {
    const angle = (at * Math.PI * 2) / count + 0.2;
    const piece = size * (0.1 + (at % 3) * 0.025);
    ctx.save();
    ctx.translate(x + Math.cos(angle) * travel, y + Math.sin(angle) * travel);
    ctx.rotate(angle + time * 0.35);
    if (at % 3 === 0) {
      circle(ctx, 0, 0, piece, look.bronze, look.ink, 1.5);
      circle(ctx, 0, 0, piece * 0.42, look.iron, look.ink, 1);
    } else polygon(ctx, [[-piece, -piece * 0.45], [piece, 0], [-piece * 0.55, piece * 0.7]], at % 2 ? look.bronzeLight : look.ironLight, look.ink, 1.5);
    ctx.restore();
  }
  ctx.restore();
}

function arm(ctx, look, side, open, time) {
  ctx.save();
  ctx.translate(side * 63, -4);
  ctx.rotate(side * (open ? 0.08 : -0.18 + Math.sin(time * 1.3 + side) * 0.05));
  polygon(ctx, [[0, -57], [side * 30, -42], [side * 35, 25], [side * 12, 58], [-side * 12, 34]], open ? look.iron : look.ironLight, look.ink, 4);
  roundedRect(ctx, -10, -48, 20, 47, 5);
  paint(ctx, look.bronzeDark, look.ink, 2);
  if (!open) line(ctx, [[0, -47], [0, -76]], look.enemy, 5);
  ctx.restore();
  circle(ctx, side * 67, 5, 17, open ? look.ironLight : look.iron, look.ink, 3);
  if (open) circle(ctx, side * 67, 5, 8, look.ink);
}

function chest(ctx, look, side, open) {
  if (open) polygon(ctx, [[side * 4, -39], [side * 30, -31], [side * 25, 24], [side * 4, 34]], look.bronzeLight, look.ink, 2);
  else polygon(ctx, [[0, -43], [side * 31, -30], [side * 27, 29], [0, 42]], look.iron, look.ink, 3);
}

export function drawBoss(ctx, x, y, reach, look, { time = 0, open = [false, false] } = {}) {
  const [spent, lit] = [open[0] && open[1], open[0] !== open[1]];
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 1.5) * 2);
  ctx.scale(reach / 67, reach / 67);
  ctx.translate(0, -5);
  polygon(ctx, [[0, -89], [39, -70], [52, -29], [41, 51], [0, 85], [-41, 51], [-52, -29], [-39, -89]], spent ? look.iron : look.bronze, look.ink, 4);
  [-1, 1].forEach((side, at) => arm(ctx, look, side, open[at], time));
  [-1, 1].forEach((side, at) => chest(ctx, look, side, open[at]));
  circle(ctx, 0, 0, 26, look.iron, look.ink, 3);
  circle(ctx, 0, 0, 19 + (lit ? Math.sin(time * 3) * 2 : 0), spent ? look.ironLight : lit ? look.enemyCore : look.enemyDark, spent ? look.ink : look.enemy, 3);
  if (lit) circle(ctx, -5, -5, 5, look.white);
  ctx.restore();
}
