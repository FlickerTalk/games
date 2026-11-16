import { handOrder } from "./picking.js";
import { HAND, isEight, play, turn } from "./rules.js";

export const PLAY_MS = 280;
export const DRAW_MS = 320;
export const SUIT_MS = 300;
export const PASS_MS = 700;
export const DEAL_STEP_MS = 70;
export const FLIP_MS = 240;
export const DEAL_MS = HAND * 2 * DEAL_STEP_MS + FLIP_MS;

const clamp = (value) => Math.min(1, Math.max(0, value));
const shape = (state) => JSON.stringify([state.phase, state.pile, state.hands, state.stock, state.suit, state.next, state.passes]);

function follows(before, after, move, side) {
  const played = play(before, move, side);
  return Boolean(played.state) && shape(played.state) === shape(after);
}

export function planMove(before, after, move, me) {
  if (!before || !after || typeof move !== "string") return null;
  if (before.phase === "shuffle" && after.phase === "play") return { kind: "deal", count: HAND * 2 };
  if (before.phase !== "play") return null;
  const side = turn(before);
  if (!follows(before, after, move, side)) return null;
  const mine = side === me;
  if (move === "d") return { kind: "draw", side, mine, card: mine ? after.hands[me].find((card) => !before.hands[me].includes(card)) : null };
  if (move === "x") return { kind: "pass", side, mine };
  const card = Number(/^p(\d+)/.exec(move)[1]);
  return { kind: "play", side, mine, card, from: mine ? handOrder(before.hands[me]).indexOf(card) : null, eight: isEight(card) };
}

function timeline(plan, travel) {
  if (plan.kind === "deal") return { flight: plan.count * DEAL_STEP_MS, total: plan.count * DEAL_STEP_MS + FLIP_MS };
  if (plan.kind === "pass") return { flight: 0, total: PASS_MS };
  const flight = travel ? (plan.kind === "draw" ? DRAW_MS : PLAY_MS) : 0;
  return { flight, total: flight + (plan.eight ? SUIT_MS : 0) };
}

export function moveFrame(plan, elapsed, { travel = true } = {}) {
  const { flight, total } = timeline(plan, travel);
  const frame = { progress: flight ? clamp(elapsed / flight) : 1, done: elapsed >= total };
  if (plan.kind === "play") frame.suit = plan.eight ? (elapsed < flight ? 0 : clamp((elapsed - flight) / SUIT_MS)) : null;
  if (plan.kind === "pass") frame.fade = clamp(elapsed / PASS_MS);
  if (plan.kind === "deal") {
    frame.dealt = Math.min(plan.count, Math.floor(Math.max(0, elapsed) / DEAL_STEP_MS));
    frame.step = clamp((elapsed - frame.dealt * DEAL_STEP_MS) / DEAL_STEP_MS);
    frame.flip = clamp((elapsed - flight) / FLIP_MS);
  }
  return frame;
}

export function cueTimes(plan, { travel = true } = {}) {
  const { flight } = timeline(plan, travel);
  if (plan.kind === "play") return [{ cue: "card", at: flight }];
  if (plan.kind === "draw") return [{ cue: "draw", at: 0 }];
  if (plan.kind === "deal") return [{ cue: "deal", at: 0 }, { cue: "card", at: flight }];
  return [];
}
