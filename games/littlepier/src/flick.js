import { visitorAt } from "./pond.js";
import { LOWER, visitorsIn } from "./round.js";

const SEAT = 1;
const LEAD = 0.25;
const PATIENCE = 1.2;
const RETRY = 0.8;

export const freshFlick = () => ({ plan: null, restUntil: 0, landed: 0 });

function arrival(visitor, x, pace) {
  const start = visitorAt(visitor, visitor.enter, pace).x;
  return visitor.enter + Math.abs(x - start) / (visitor.speed * pace);
}

function choose(round, hook) {
  const busy = new Set([...round.caught.flat(), ...round.fled.map((one) => one.id), ...round.hooks.map((one) => one.fish)]);
  let best = null;
  for (const visitor of visitorsIn(round)) {
    if (busy.has(visitor.id)) continue;
    const meet = arrival(visitor, hook.x, round.pace);
    const start = meet - visitor.depth / LOWER;
    if (start < round.time + LEAD || meet > round.seconds) continue;
    if (!best || meet < best.meet) best = { id: visitor.id, start, meet, until: meet + PATIENCE };
  }
  return best;
}

export function flickHolding(round, memory, { rest }) {
  const hook = round.hooks[SEAT];
  const landed = round.caught[SEAT].length;
  let next = { ...memory };
  if (landed > memory.landed) next = { plan: null, restUntil: round.time + rest, landed };
  if (hook.fish !== null) return { holding: false, memory: { ...next, plan: null } };
  if (round.time < next.restUntil) return { holding: false, memory: next };
  if (next.plan && round.time > next.plan.until) next = { ...next, plan: null, restUntil: round.time + RETRY };
  if (!next.plan && round.time >= next.restUntil && hook.y === 0) next = { ...next, plan: choose(round, hook) };
  const holding = Boolean(next.plan) && round.time >= next.plan.start;
  return { holding, memory: next };
}
