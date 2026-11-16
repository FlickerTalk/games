import { inPond, visitorAt, visitorsOf } from "./pond.js";

export const HOOK_X = Object.freeze([0.4, 0.6]);
export const LOWER = 0.45;
export const RAISE = 0.8;
export const SLIP_SECONDS = 2.4;
const STEP = 0.05;
const WET = 0.03;

const freshHook = (x) => ({ x, y: 0, fish: null, held: 0 });

export const visitorsIn = (round) => round.visitors ?? visitorsOf(round.seed);

export function startRound({ seed, seconds, pace, anglers = 1 }) {
  const hooks = HOOK_X.slice(0, anglers);
  return { seed, seconds, pace, time: 0, over: false, hooks: hooks.map(freshHook), caught: hooks.map(() => []), fled: [] };
}

export const catchesOf = (round) => round.caught.reduce((sum, list) => sum + list.length, 0);

function taken(round) {
  const ids = new Set(round.caught.flat());
  for (const one of round.fled) ids.add(one.id);
  for (const hook of round.hooks) if (hook.fish !== null) ids.add(hook.fish);
  return ids;
}

function biter(round, hook, reach) {
  const busy = taken(round);
  const radius = reach.radius * reach.radius;
  for (const visitor of visitorsIn(round)) {
    if (busy.has(visitor.id) || !inPond(visitor, round.time, round.pace)) continue;
    const at = visitorAt(visitor, round.time, round.pace);
    const dx = (at.x - hook.x) * reach.w;
    const dy = (at.y - hook.y) * reach.h;
    if (dx * dx + dy * dy <= radius) return visitor;
  }
  return null;
}

function slip(round, hook, events, index) {
  const visitor = visitorsIn(round).find((one) => one.id === hook.fish);
  const at = visitorAt(visitor, round.time, round.pace);
  round.fled.push({ id: hook.fish, at: round.time, x: hook.x, y: hook.y, direction: visitor.direction, depth: at.y });
  events.push({ kind: "slip", hook: index, id: hook.fish });
  return { ...hook, fish: null, held: 0 };
}

function moveHook(round, index, step, holding, events) {
  let hook = { ...round.hooks[index] };
  if (holding) {
    hook.y = Math.min(1, hook.y + LOWER * step);
    if (hook.fish !== null) hook.held += step;
    if (hook.fish !== null && hook.held >= SLIP_SECONDS) hook = slip(round, hook, events, index);
  } else {
    hook.y = Math.max(0, hook.y - RAISE * step);
    if (hook.y === 0 && hook.fish !== null) {
      round.caught[index].push(hook.fish);
      events.push({ kind: "catch", hook: index, id: hook.fish });
      hook = { ...hook, fish: null, held: 0 };
    }
  }
  return hook;
}

function bite(round, index, reach, events) {
  const hook = round.hooks[index];
  if (hook.fish !== null || hook.y <= WET) return;
  const found = biter(round, hook, reach);
  if (!found) return;
  round.hooks[index] = { ...hook, fish: found.id, held: 0 };
  events.push({ kind: "bite", hook: index, id: found.id });
}

function finish(round, events) {
  round.hooks = round.hooks.map((hook, index) => {
    if (hook.fish === null) return hook;
    round.caught[index].push(hook.fish);
    events.push({ kind: "catch", hook: index, id: hook.fish });
    return { ...hook, fish: null, held: 0 };
  });
  round.over = true;
  events.push({ kind: "end" });
}

function tick(round, step, holding, reach, events) {
  round.time = Math.min(round.seconds, round.time + step);
  round.hooks.forEach((_, index) => {
    round.hooks[index] = moveHook(round, index, step, Boolean(holding[index]), events);
    bite(round, index, reach, events);
  });
  if (round.time >= round.seconds) finish(round, events);
}

export function stepRound(round, seconds, { holding = [], reach }) {
  const events = [];
  if (round.over) return { round, events };
  const next = { ...round, hooks: round.hooks.map((hook) => ({ ...hook })), caught: round.caught.map((list) => [...list]), fled: [...round.fled] };
  let left = Math.max(0, seconds);
  while (left > 1e-9 && !next.over) {
    const step = Math.min(STEP, left);
    tick(next, step, holding, reach, events);
    left -= step;
  }
  return { round: next, events };
}

export const roundSnapshot = ({ seed, seconds, pace, time, caught, fled }) => ({ seed, seconds, pace, time, caught, fled });

const isList = (value) => Array.isArray(value) && value.every((one) => Number.isInteger(one));

export function resumeRound(kept, { anglers = 1 } = {}) {
  if (!kept || typeof kept.seed !== "string" || ![kept.seconds, kept.pace, kept.time].every(Number.isFinite)) return null;
  if (!Array.isArray(kept.caught) || !kept.caught.every(isList) || !Array.isArray(kept.fled)) return null;
  const round = startRound({ seed: kept.seed, seconds: kept.seconds, pace: kept.pace, anglers });
  return { ...round, time: Math.min(kept.time, kept.seconds), caught: round.caught.map((_, at) => [...(kept.caught[at] ?? [])]), fled: kept.fled.filter((one) => Number.isInteger(one?.id)) };
}
