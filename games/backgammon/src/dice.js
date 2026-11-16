import { TAU, circle, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { diceSpots } from "./layout.js";

const PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
const ROCK_HZ = 0.8;
const WAITING_ALPHA = 0.45;
const USED_ALPHA = 0.4;

const settle = (progress) => 1 - (1 - Math.min(1, Math.max(0, progress))) ** 3;

export function diceFaces(dice, left) {
  if (dice[0] === dice[1]) {
    const spent = 4 - left.length;
    return { faces: [dice[0], dice[0], dice[0], dice[0]], used: [0, 1, 2, 3].map((at) => at < spent) };
  }
  const remaining = [...left];
  const used = dice.map((value) => {
    const at = remaining.indexOf(value);
    if (at < 0) return true;
    remaining.splice(at, 1);
    return false;
  });
  return { faces: [...dice], used };
}

function placement(size, { tumble = null, waiting = false, time = 0, turn = 1 }) {
  if (waiting) return { dy: 0, angle: Math.sin(time * TAU * ROCK_HZ) * 0.12, scale: 1 };
  if (tumble === null || tumble >= 1) return { dy: 0, angle: 0, scale: 1 };
  const rest = 1 - settle(tumble);
  return { dy: -size * 0.15 * Math.sin(tumble * Math.PI) * rest, angle: turn * 0.9 * rest, scale: 1 - 0.2 * rest };
}

export function drawDie(ctx, theme, x, y, size, value, { side = 0, used = false, tumble = null, waiting = false, time = 0, turn = 1 } = {}) {
  const look = theme.dice[side];
  const { dy, angle, scale } = placement(size, { tumble, waiting, time, turn });
  const corner = size * 0.2;
  const shown = tumble !== null && tumble < 0.5 ? (value % 6) + 1 : value;
  ctx.save();
  ctx.translate(x, y + dy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  if (waiting) ctx.globalAlpha *= WAITING_ALPHA;
  else if (used) ctx.globalAlpha *= USED_ALPHA;
  roundedRect(ctx, -size / 2, -size / 2 + size * 0.07, size, size, corner);
  paint(ctx, theme.ink, null, 0);
  roundedRect(ctx, -size / 2, -size / 2, size, size, corner);
  paint(ctx, look.face, theme.ink, Math.max(1.5, size * 0.05));
  if (!waiting) for (const [px, py] of PIPS[shown] ?? []) circle(ctx, px * size * 0.24, py * size * 0.24, size * 0.072, look.pip);
  if (used && !waiting) line(ctx, [[-size * 0.3, size * 0.3], [size * 0.3, -size * 0.3]], theme.marks.line, Math.max(2, size * 0.07));
  ctx.restore();
}

export function drawDice(ctx, theme, layout, { side, faces, used = [], tumble = null, waiting = false, time = 0 }) {
  const spots = diceSpots(layout, faces.length);
  faces.forEach((value, at) => {
    const { x, y, size } = spots[at];
    drawDie(ctx, theme, x, y, size, value, { side, used: used[at], tumble, waiting, time, turn: at % 2 ? -1 : 1 });
  });
}
