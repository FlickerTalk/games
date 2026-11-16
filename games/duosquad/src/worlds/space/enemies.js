import { circle, clamp, ease, line, paint, polygon, roundedRect } from "../../../../../kit/src/canvas/pen.js";
import { drawSeatMark } from "../marks.js";

function core(ctx, look, x, y, radius) {
  circle(ctx, x, y, radius + 3, look.visor, look.ink, 2);
  circle(ctx, x, y, radius, look.enemy, look.enemyLight, 2);
  circle(ctx, x - radius * 0.2, y - radius * 0.22, radius * 0.3, look.enemyCore);
}

const hull = (ctx, look, points, fill = look.enemyBody, width = 3) => polygon(ctx, points, fill, look.ink, width);
const both = (ctx, look, points, fill) => [1, -1].forEach((side) => hull(ctx, look, points.map(([x, y]) => [side * x, y]), fill, 2));

const DRONES = {
  scout(ctx, look) {
    hull(ctx, look, [[0, 32], [26, -18], [10, -12], [0, -31], [-10, -12], [-26, -18]]);
    hull(ctx, look, [[0, 24], [11, -9], [0, -20], [-11, -9]], look.enemyDark, 2);
    line(ctx, [[-22, -15], [-9, 8]], look.enemy, 3);
    line(ctx, [[22, -15], [9, 8]], look.enemy, 3);
    core(ctx, look, 0, 2, 7);
  },
  weaver(ctx, look) {
    hull(ctx, look, [[0, -25], [15, -8], [34, -15], [23, 13], [8, 8], [0, 30], [-8, 8], [-23, 13], [-34, -15], [-15, -8]]);
    both(ctx, look, [[30, -12], [12, -4], [20, 8]], look.enemy);
    core(ctx, look, 0, 0, 8);
  },
  heavy(ctx, look) {
    hull(ctx, look, [[0, -31], [30, -17], [36, 12], [19, 29], [-19, 29], [-36, 12], [-30, -17]]);
    hull(ctx, look, [[0, -25], [23, -12], [25, 13], [0, 24], [-25, 13], [-23, -12]], look.enemyDark, 2);
    for (const side of [-1, 1]) {
      roundedRect(ctx, side * 24 - 7, -7, 14, 24, 3);
      paint(ctx, look.enemy, look.ink, 2);
    }
    core(ctx, look, 0, 0, 11);
  },
  twin(ctx, look) {
    hull(ctx, look, [[-3, -32], [-29, -12], [-25, 21], [-5, 30], [-9, 4]]);
    hull(ctx, look, [[3, -32], [29, -12], [25, 21], [5, 30], [9, 4]]);
    both(ctx, look, [[8, -20], [23, -9], [19, 13], [10, 17]], look.enemy);
    core(ctx, look, -12, 1, 6);
    core(ctx, look, 12, 1, 6);
    line(ctx, [[0, -25], [0, 24]], look.enemyLight, 2);
  },
  gunner(ctx, look) {
    hull(ctx, look, [[0, -32], [27, -16], [27, 16], [0, 32], [-27, 16], [-27, -16]]);
    hull(ctx, look, [[0, -25], [20, -12], [20, 12], [0, 25], [-20, 12], [-20, -12]], look.enemyDark, 2);
    roundedRect(ctx, -7, 5, 14, 29, 4);
    paint(ctx, look.metal, look.ink, 2);
    line(ctx, [[-20, -11], [20, -11]], look.enemy, 3);
    core(ctx, look, 0, -1, 9);
  },
  elite(ctx, look) {
    hull(ctx, look, [[0, -35], [17, -7], [32, 5], [13, 13], [0, 32], [-13, 13], [-32, 5], [-17, -7]]);
    hull(ctx, look, [[0, -29], [10, 0], [0, 24], [-10, 0]], look.enemy, 2);
    both(ctx, look, [[28, 4], [12, -4], [15, 10]], look.enemyDark);
    core(ctx, look, 0, 1, 7);
  },
  core(ctx, look, { owner, time }) {
    circle(ctx, 0, 0, 30, look.visor, look.bodies[owner][0], 4);
    drawSeatMark(ctx, 0, 0, 30, owner, look.bodies[owner][0]);
    ctx.globalAlpha = 0.4 + Math.sin(time * 3 + owner) * 0.12;
    circle(ctx, 0, 0, 37, null, look.bodies[owner][0], 2.5);
  },
};

function shieldArc(ctx, look, left, time) {
  ctx.save();
  ctx.strokeStyle = look.enemyLight;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 9]);
  ctx.lineDashOffset = -time * 6;
  ctx.beginPath();
  ctx.arc(0, 0, 41, 0, Math.PI * 2 * clamp(left));
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx, x, y, size, kind, look, { time = 0, hit = 0, left = 1, owner = 0 } = {}) {
  ctx.save();
  ctx.translate(x + (hit ? Math.sin(hit * Math.PI * 5) * 3 : 0), y + Math.sin(time * 2 + x * 0.01) * 2);
  ctx.rotate(Math.sin(time * 1.5 + x) * 0.025);
  ctx.scale(size / 72, size / 72);
  (DRONES[kind] ?? DRONES.scout)(ctx, look, { owner, time });
  if (left < 1 || kind === "heavy") shieldArc(ctx, look, kind === "core" ? left : 0.4 + left * 0.6, time);
  if (hit) {
    ctx.globalAlpha = Math.sin(clamp(hit) * Math.PI) * 0.65;
    circle(ctx, 0, 0, 29, look.shotLight);
  }
  ctx.restore();
}

export function drawPop(ctx, x, y, size, kind, progress, look, time = 0) {
  const p = clamp(progress);
  const travel = size * ease(p) * 0.6;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  if (p < 0.3) circle(ctx, x, y, size * (0.18 + p), look.shotLight);
  for (let at = 0; at < 7; at += 1) {
    const angle = (at * Math.PI * 2) / 7 + 0.2;
    const shard = size * (0.1 + (at % 3) * 0.025);
    ctx.save();
    ctx.translate(x + Math.cos(angle) * travel, y + Math.sin(angle) * travel);
    ctx.rotate(angle + time * 0.7);
    polygon(ctx, [[-shard, -shard * 0.45], [shard, 0], [-shard * 0.55, shard * 0.7]], at % 2 ? look.enemy : look.metal, look.ink, 1.5);
    ctx.restore();
  }
  ctx.restore();
}

function panel(ctx, look, points, open, side) {
  ctx.save();
  if (open) ctx.translate(side * 13, -8);
  polygon(ctx, points, open ? look.metalDark : look.enemyBody, look.ink, 3);
  ctx.restore();
}

// `reach` is the distance in pixels from the middle of the command ship to each of its two cores.
export function drawBoss(ctx, x, y, reach, look, { time = 0, open = [false, false] } = {}) {
  const done = open[0] && open[1];
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 1.2) * 2);
  ctx.scale(reach / 67, reach / 67);
  polygon(ctx, [[0, -100], [48, -54], [100, -10], [82, 61], [34, 45], [0, 91], [-34, 45], [-82, 61], [-100, -10], [-48, -54]], look.enemyDark, look.ink, 3);
  polygon(ctx, [[0, -91], [30, -39], [25, 50], [0, 74], [-25, 50], [-30, -39]], look.enemyBody, look.ink, 3);
  for (const side of [-1, 1]) {
    panel(ctx, look, [[side * 35, -45], [side * 88, -5], [side * 72, 43], [side * 32, 29]], open[side === 1 ? 1 : 0], side);
    line(ctx, [[side * 45, -34], [side * 75, -4], [side * 65, 24]], look.enemy, 5);
  }
  const radius = done ? 17 : 19 + Math.sin(time * 3) * 1.5;
  circle(ctx, 0, 4, radius + 8, look.visor, look.ink, 3);
  circle(ctx, 0, 4, radius, done ? look.metalDark : look.enemyDark, look.enemy, 3);
  line(ctx, [[0, -75], [0, -29]], look.enemyLight, 3);
  ctx.restore();
}
