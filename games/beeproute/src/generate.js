import { randomOf } from "../../../kit/src/canvas/random.js";
import { LIMITS, STEPS, checkLevel, makeLevel } from "./level.js";
import { MOST } from "./program.js";
import { shortest } from "./solver.js";

const ATTEMPTS = 80;
const NEAR_PATH = 0.7;
const PUDDLES = 0.4;

const whole = (value, low, high) => Math.min(high, Math.max(low, Math.floor(Number.isFinite(value) ? value : low)));

function shapeOf(values) {
  return {
    size: whole(values.size, 5, 7),
    turns: whole(values.turns, 0, 8),
    batteries: whole(values.batteries, 0, LIMITS.batteries),
    blocks: whole(values.blocks, 0, 16),
    doors: whole(values.doors, 0, LIMITS.doors),
  };
}

const pick = (random, list) => list[Math.floor(random() * list.length)];

function runAhead(size, taken, at, dir) {
  const [dx, dy] = STEPS[dir];
  let [x, y] = [at % size, Math.floor(at / size)];
  let free = 0;
  for (;;) {
    [x, y] = [x + dx, y + dy];
    if (x < 0 || y < 0 || x >= size || y >= size || taken.has(y * size + x)) return free;
    free += 1;
  }
}

function walk(random, { size, turns }) {
  const start = Math.floor(random() * size * size);
  let dir = Math.floor(random() * 4);
  const path = [start];
  const taken = new Set(path);
  for (let segment = 0; segment <= turns; segment += 1) {
    const ways = segment === 0 ? [dir] : random() < 0.5 ? [(dir + 1) % 4, (dir + 3) % 4] : [(dir + 3) % 4, (dir + 1) % 4];
    const way = ways.find((one) => runAhead(size, taken, path.at(-1), one) > 0);
    if (way === undefined) {
      if (segment === 0) continue;
      break;
    }
    dir = way;
    const length = 1 + Math.floor(random() * runAhead(size, taken, path.at(-1), dir));
    const [dx, dy] = STEPS[dir];
    for (let step = 0; step < length; step += 1) {
      const last = path.at(-1);
      const next = (Math.floor(last / size) + dy) * size + (last % size) + dx;
      path.push(next);
      taken.add(next);
    }
  }
  return { start, dir: Math.floor(random() * 4), path };
}

function neighbours(size, at) {
  const [x, y] = [at % size, Math.floor(at / size)];
  return STEPS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < size && ny < size).map(([nx, ny]) => ny * size + nx);
}

function placeBlocks(random, cells, { size, blocks }, path) {
  const onPath = new Set(path);
  const free = cells.flatMap((one, at) => (one === "." && !onPath.has(at) ? [at] : []));
  const near = new Set(path.flatMap((at) => neighbours(size, at)).filter((at) => free.includes(at)));
  for (let placed = 0; placed < blocks && free.length; placed += 1) {
    const close = free.filter((at) => near.has(at));
    const at = pick(random, close.length && random() < NEAR_PATH ? close : free);
    cells[at] = random() < PUDDLES ? "~" : "#";
    free.splice(free.indexOf(at), 1);
  }
}

function tryLevel(random, shape) {
  const { size } = shape;
  const { start, path } = walk(random, shape);
  if (path.length < 2) return null;
  const cells = Array(size * size).fill(".");
  cells[path.at(-1)] = "G";
  const inner = path.slice(1, -1);
  for (const kind of ["B", "D"]) {
    const wanted = kind === "B" ? shape.batteries : shape.doors;
    for (let placed = 0; placed < wanted; placed += 1) {
      const open = inner.filter((at) => cells[at] === ".");
      if (!open.length) return null;
      cells[pick(random, open)] = kind;
    }
  }
  placeBlocks(random, cells, shape, path);
  const first = path[1];
  const facing = STEPS.findIndex(([dx, dy]) => first === start + dy * size + dx);
  const dir = random() < 0.6 ? facing : Math.floor(random() * 4);
  const level = makeLevel({ size, start: { at: start, dir }, cells: cells.join("") });
  return checkLevel(level) ? null : level;
}

function plainLevel(size) {
  const cells = Array(size * size).fill(".");
  cells[Math.floor(size / 2)] = "G";
  return makeLevel({ size, start: { at: size * (size - 1) + Math.floor(size / 2), dir: 0 }, cells: cells.join("") });
}

export function generateLevel(seed, values) {
  const shape = shapeOf(values);
  const least = Math.max(3, shape.turns + 2);
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const level = tryLevel(randomOf(`${seed}/${attempt}`), shape);
    const way = level && shortest(level);
    if (way && way.length >= least && way.length <= MOST - 4) return level;
  }
  return plainLevel(shape.size);
}
