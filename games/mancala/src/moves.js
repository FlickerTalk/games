import { STORE, across, initial, pitOf, play, turn } from "./rules.js";

export const SEED_MS = 340;
export const CAPTURE_MS = 640;
export const SPARKLE_MS = 480;

function pathOf(pits, from, side) {
  const path = [];
  let at = from;
  for (let seeds = pits[from]; seeds > 0; ) {
    at = (at + 1) % pits.length;
    if (at === STORE[1 - side]) continue;
    path.push(at);
    seeds -= 1;
  }
  return path;
}

function sownPits(pits, from, path) {
  const sown = [...pits];
  sown[from] = 0;
  for (const pit of path) sown[pit] += 1;
  return sown;
}

export function planSow(before, move, side) {
  const played = before ? play(before, move, side) : {};
  if (!played.state) return null;
  const from = pitOf(side, move);
  const path = pathOf(before.pits, from, side);
  const landing = path.at(-1);
  const sown = sownPits(before.pits, from, path);
  const after = played.state.pits;
  const capture = after[landing] === sown[landing] ? null : { landing, across: across(landing), store: STORE[side], seeds: sown[landing] + sown[across(landing)] };
  return { side, move, from, path, extra: landing === STORE[side], capture, before: before.pits, after, next: played.state.next };
}

export function planBetween(before, after, move) {
  if (!before || !after || !Number.isInteger(move)) return null;
  const plan = planSow(before, move, turn(before));
  if (!plan || plan.next !== after.next || plan.after.some((seeds, pit) => seeds !== after.pits[pit])) return null;
  return plan;
}

export function plansAfter(state, moves) {
  const plans = [];
  let at = state;
  for (const move of moves) {
    const plan = planSow(at, move, turn(at));
    if (!plan) return null;
    plans.push(plan);
    at = { pits: plan.after, next: plan.next };
  }
  return plans;
}

export function lastMover(moves) {
  if (!Array.isArray(moves) || !moves.length) return null;
  return plansAfter(initial(), moves)?.at(-1)?.side ?? null;
}

const travelMs = (plan) => plan.path.length * SEED_MS;

const storeLandings = (plan) => plan.path.flatMap((pit, at) => (pit === STORE[plan.side] ? [(at + 1) * SEED_MS] : []));

export function sowMs(plan) {
  const travel = travelMs(plan);
  return Math.max(travel + (plan.capture ? CAPTURE_MS : 0), ...storeLandings(plan).map((ms) => ms + SPARKLE_MS));
}

function sparkleAt(plan, at) {
  const landed = storeLandings(plan).filter((ms) => ms <= at).at(-1);
  if (landed === undefined || at - landed >= SPARKLE_MS) return null;
  return (at - landed) / SPARKLE_MS;
}

export function sowFrame(plan, elapsed) {
  const at = Math.max(0, elapsed);
  if (at >= sowMs(plan)) return { pits: plan.after, hop: null, capture: null, sparkle: null, done: true };
  const travel = travelMs(plan);
  const landed = Math.min(plan.path.length, Math.floor(at / SEED_MS));
  const shown = sownPits(plan.before, plan.from, plan.path.slice(0, landed));
  const hop = at < travel ? { from: landed ? plan.path[landed - 1] : plan.from, to: plan.path[landed], progress: (at - landed * SEED_MS) / SEED_MS } : null;
  const capture = plan.capture && at >= travel ? (at - travel) / CAPTURE_MS : null;
  if (capture !== null) {
    shown[plan.capture.landing] = 0;
    shown[plan.capture.across] = 0;
  }
  return { pits: shown, hop, capture, sparkle: sparkleAt(plan, at), done: false };
}

export function cuesBetween(plan, from, to) {
  const heard = (ms) => ms > from && ms <= to;
  const cues = plan.path.flatMap((pit, at) => (heard((at + 1) * SEED_MS) ? [pit === STORE[plan.side] ? "store" : "seed"] : []));
  if (heard(travelMs(plan))) {
    if (plan.extra) cues.push("extra");
    if (plan.capture) cues.push("capture");
  }
  return cues;
}
