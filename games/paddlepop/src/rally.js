import { randomOf } from "../../../kit/src/canvas/random.js";
import { TABLE } from "./table.js";

export const SURPRISES = Object.freeze(["bubbles", "star", "second", "snail"]);

const SERVES = [[0.28, 0.96], [-0.28, 0.96], [0.42, 0.9075], [-0.42, 0.9075]];
const SERVE_PACE = 0.85;
const MIDDLE = TABLE.length / 2;
const BAND = 0.3;
const CLEAR = 0.2;

const between = (random, low, high) => low + random() * (high - low);
const apart = (one, two) => Math.hypot(one.x - two.x, one.y - two.y);

function orderOf(seed, block) {
  const random = randomOf(`${seed}/surprises/${block}`);
  const order = [...SURPRISES];
  for (let at = order.length - 1; at > 0; at -= 1) {
    const swap = Math.floor(random() * (at + 1));
    [order[at], order[swap]] = [order[swap], order[at]];
  }
  if (block > 0 && order[0] === orderOf(seed, block - 1).at(-1)) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

function kindOf(seed, k) {
  if (k <= 0) return "none";
  return orderOf(seed, Math.floor((k - 1) / SURPRISES.length))[(k - 1) % SURPRISES.length];
}

function placeBubbles(random) {
  const wanted = random() < 0.5 ? 2 : 3;
  const bubbles = [];
  for (let tries = 0; tries < 60 && bubbles.length < wanted; tries += 1) {
    const r = between(random, 0.06, 0.075);
    const bubble = { x: between(random, 0.12 + r, 0.88 - r), y: MIDDLE + between(random, -BAND, BAND), r, popped: false };
    if (apart(bubble, { x: 0.5, y: MIDDLE }) <= CLEAR) continue;
    if (bubbles.some((other) => apart(bubble, other) <= bubble.r + other.r + 0.1)) continue;
    bubbles.push(bubble);
  }
  return bubbles;
}

function placePickup(random, look) {
  const side = random() < 0.5 ? -1 : 1;
  return { look, x: 0.5 + side * between(random, 0.12, 0.3), y: MIDDLE + between(random, -0.25, 0.25), taken: false };
}

function serve(i, k, toward, aim, speed) {
  const [across, along] = SERVES[aim];
  const pace = speed * SERVE_PACE;
  return { i, k, v: 0, by: -1, x: 0.5, y: MIDDLE, vx: across * pace, vy: (toward === 0 ? along : -along) * pace, sp: speed, slow: 0, hits: 0 };
}

function towardOf(lost, random) {
  if (lost[0] !== lost[1]) return lost[0] > lost[1] ? 0 : 1;
  return random() < 0.5 ? 0 : 1;
}

export function rallyOf(seed, k, lost, speed) {
  const random = randomOf(`${seed}/rally/${k}`);
  const kind = kindOf(seed, k);
  const toward = towardOf(lost, random);
  const aim = Math.floor(random() * SERVES.length);
  const balls = [serve(0, k, toward, aim, speed)];
  if (kind === "second") balls.push(serve(1, k, 1 - toward, aim ^ 1, speed));
  return {
    k,
    kind,
    toward,
    bubbles: kind === "bubbles" ? placeBubbles(random) : [],
    pickup: kind === "star" || kind === "snail" ? placePickup(random, kind) : null,
    balls,
  };
}
