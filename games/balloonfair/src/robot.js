import { randomOf } from "../../../kit/src/canvas/random.js";
import { rivalPace } from "../../../kit/src/progress/rival.js";

const PACE = { even: 2, full: 10, slowest: 0.6, fastest: 1.15 };
// steps of 1/40 s
const FIRST_REST = 50;
const AIM_LEAST = 20;
const AIM_SPAN = 50;
const AIM_JITTER = 16;
const REST = 6;
const CLOUD_REST = 40;
const HIT_LEAST = 0.6;
const HIT_SPAN = 0.35;
const SLIP = 0.12;
const REACH = [0.1, 0.95];

export const newFlick = (seed) => ({ random: randomOf(`${seed}/flick`), target: null, fireAt: 0, restUntil: FIRST_REST });

function choose(flick, shown, sure, step) {
  const reachable = shown.filter(({ v }) => v > REACH[0] && v < REACH[1]);
  if (!reachable.length) return;
  const wanted = reachable.filter(({ balloon }) => balloon.kind !== "cloud");
  const slips = flick.random() < (1 - sure) * SLIP;
  const pool = slips ? reachable : wanted;
  if (!pool.length) return;
  flick.target = pool[Math.floor(flick.random() * pool.length)].balloon.id;
  flick.fireAt = step + Math.round(AIM_LEAST + (1 - sure) * AIM_SPAN + flick.random() * AIM_JITTER);
}

export function flickStep(flick, { step, shown, skill, lead }) {
  const sure = Math.min(1, Math.max(0, skill * rivalPace(lead, PACE)));
  if (flick.target === null) {
    if (step >= flick.restUntil) choose(flick, shown, sure, step);
    return null;
  }
  if (step < flick.fireAt) return null;
  const found = shown.find(({ balloon }) => balloon.id === flick.target);
  flick.target = null;
  const cloud = found?.balloon.kind === "cloud";
  flick.restUntil = step + REST + Math.round(flick.random() * REST) + (cloud ? CLOUD_REST : 0);
  if (!found) return null;
  if (cloud) return { kind: "puff", id: found.balloon.id };
  return { kind: flick.random() < HIT_LEAST + HIT_SPAN * sure ? "pop" : "miss", id: found.balloon.id };
}
