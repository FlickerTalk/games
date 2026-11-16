import { trim } from "./program.js";
import { runProgram, startOf, stepFrom } from "./run.js";

const ACTIONS = ["F", "L", "R", "U"];
const DEAD = ["bump", "splash", "idle"];
const DEEPEST = 60;

const keyOf = (level, { x, y, dir, got, opened }) => x + level.size * (y + level.size * (dir + 4 * (got + 16 * opened)));

function pathTo(parents, key) {
  const path = [];
  for (let at = key; parents.get(at).action; at = parents.get(at).from) path.unshift(parents.get(at).action);
  return path;
}

export function shortestFrom(level, from) {
  const first = keyOf(level, from);
  const parents = new Map([[first, { from: null, action: null, depth: 0 }]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head += 1) {
    const state = queue[head];
    const key = keyOf(level, state);
    if (parents.get(key).depth >= DEEPEST) continue;
    for (const action of ACTIONS) {
      const { state: next, event } = stepFrom(level, state, action);
      if (DEAD.includes(event)) continue;
      const nextKey = keyOf(level, next);
      if (parents.has(nextKey) && event !== "goal") continue;
      parents.set(nextKey, { from: key, action, depth: parents.get(key).depth + 1 });
      if (event === "goal") return pathTo(parents, nextKey);
      queue.push(next);
    }
  }
  return null;
}

export const shortest = (level) => shortestFrom(level, startOf(level));

const same = (way, at, length) => way.slice(at, at + length).join("");

function bestRing(way) {
  let best = null;
  for (let length = 1; length * 2 <= way.length; length += 1) {
    for (let at = 0; at + length * 2 <= way.length; at += 1) {
      let times = 1;
      while (times < 3 && at + (times + 1) * length <= way.length && same(way, at, length) === same(way, at + times * length, length)) times += 1;
      const saving = length * times - (length + 1);
      if (times > 1 && saving > 0 && (!best || saving > best.saving)) best = { at, length, times, saving };
    }
  }
  return best;
}

export function withLoops(way) {
  const found = bestRing(way);
  if (!found) return [...way];
  const { at, length, times } = found;
  const body = way.slice(at, at + length);
  return [...withLoops(way.slice(0, at)), { times, body }, ...withLoops(way.slice(at + length * times))];
}

export function nextHint(level, items) {
  const run = runProgram(level, items);
  if (run.end === "goal") return null;
  const cut = run.end === "short" ? null : run.wrong;
  const kept = cut === null ? run : runProgram(level, trim({ items, open: false }, cut).items);
  if (kept.end !== "short") return null;
  const way = shortestFrom(level, kept.state);
  return way?.length ? { cut, command: way[0] } : null;
}
