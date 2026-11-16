import { randomOf } from "../../../kit/src/canvas/random.js";
import { rivalPace } from "../../../kit/src/progress/rival.js";
import { FLOOR_MS, WINDOW_MS } from "./duel.js";

const PACE = { even: 0, full: 3, slowest: 0.75, fastest: 1.1 };
// ms
const JITTER = 110;
const QUICKEST = FLOOR_MS + 60;
const SLOWEST = WINDOW_MS - 50;
const JUMPY = 0.03;
const JUMPY_A_LURE = 0.09;
// steps
const AFTER_LURE = 12;
const BEFORE_BELL = 6;

function earlyAt(random, exchange) {
  const { fakes, signal } = exchange;
  if (random() >= JUMPY + JUMPY_A_LURE * fakes.length) return null;
  if (!fakes.length) return signal - BEFORE_BELL - Math.floor(random() * 10);
  return Math.min(signal - 1, fakes[Math.floor(random() * fakes.length)].at + AFTER_LURE);
}

export function flickPlan(seed, schedule) {
  const random = randomOf(`${seed}/flick`);
  return schedule.map((exchange) => ({ sway: random() * 2 - 1, early: earlyAt(random, exchange) }));
}

// lead: balloons Flick is ahead by
export function flickReaction(plan, { react, lead }) {
  const time = (react + plan.sway * JITTER) / rivalPace(lead, PACE);
  return Math.round(Math.min(SLOWEST, Math.max(QUICKEST, time)));
}
