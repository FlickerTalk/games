import { randomOf } from "../../../kit/src/canvas/random.js";
import { rivalPace } from "../../../kit/src/progress/rival.js";
import { CRAFT_V } from "./crafts.js";

const PACE = { even: 4, full: 16, slowest: 0.45, fastest: 1.1 };
const HOME = [0.3, 0.7];
// steps
const THINK = 14;
const THINK_SPAN = 34;
const NOTICE = 70;
const RELAX = 40;
// field widths
const SLIP = 0.16;
const SIDESTEP = 0.2;
const WATCH = [0.5, 0.95];

export const newFlick = (seed) => ({ random: randomOf(`${seed}/flick`), thinkAt: 0, goal: null, sawCaught: null, judged: new Map(), restUntil: 0 });

function threat(flick, craft, hazards, sure, { w, craft: size }) {
  for (const one of hazards) {
    if (one.v < WATCH[0] || one.v > WATCH[1] || one.v > CRAFT_V + 0.03) continue;
    if (Math.abs(one.u - craft.u) * w > size * 0.5 + one.r) continue;
    if (!flick.judged.has(one.key)) flick.judged.set(one.key, flick.random() < 0.25 + 0.75 * sure);
    if (flick.judged.get(one.key)) return one;
  }
  return null;
}

function choose(craft, mate, seen) {
  const open = seen.filter(({ enemy, v }) => v >= 0.02 && (enemy.owner === null || enemy.owner === craft.seat));
  const mine = mate.caught > 0 ? open : open.filter(({ enemy, u }) => enemy.owner === craft.seat || Math.abs(u - craft.u) <= Math.abs(u - mate.u));
  let best = null;
  for (const one of mine) if (!best || Math.abs(one.u - craft.u) < Math.abs(best.u - craft.u)) best = one;
  return best;
}

function rescue(flick, mate, step, sure) {
  if (mate.caught <= 0) {
    flick.sawCaught = null;
    return false;
  }
  flick.sawCaught ??= step;
  return step - flick.sawCaught >= (1 - sure) * NOTICE;
}

export function flickStep(flick, { step, craft, mate, seen, hazards, skill, lead, metrics }) {
  const pace = rivalPace(lead, PACE);
  const sure = Math.min(1, Math.max(0, skill * pace));
  const falling = threat(flick, craft, hazards, sure, metrics);
  if (falling) {
    const away = falling.u >= craft.u ? -1 : 1;
    craft.want = craft.u + (craft.u + away * SIDESTEP < 0.08 || craft.u + away * SIDESTEP > 0.92 ? -away : away) * SIDESTEP;
    flick.thinkAt = step + THINK;
    return;
  }
  if (rescue(flick, mate, step, sure)) {
    craft.want = mate.u;
    return;
  }
  if (step < flick.thinkAt) return;
  flick.thinkAt = step + THINK + Math.round((1 - sure) * THINK_SPAN + flick.random() * 8);
  if (pace < 1 && step >= flick.restUntil && flick.random() > pace) flick.restUntil = step + RELAX + Math.round((1 - pace) * 120);
  const found = step < flick.restUntil ? null : choose(craft, mate, seen);
  craft.want = found ? found.u + (flick.random() - 0.5) * (1 - sure) * SLIP : HOME[craft.seat];
}
