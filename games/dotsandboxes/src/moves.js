import { LINES, boxesOf, initial, play, result, turn } from "./rules.js";

export const STROKE_MS = 200;
export const POP_MS = 320;
export const BURST_MS = 460;
export const BOX_GAP_MS = 90;

const clamp = (value) => Math.min(1, Math.max(0, value));
const popAt = (index) => STROKE_MS + index * BOX_GAP_MS;

export function drawers(moves) {
  const by = Array(LINES).fill(null);
  let state = initial();
  for (const move of moves) {
    const side = turn(state);
    const played = play(state, move, side).state;
    if (!played) continue;
    by[move] = side;
    state = played;
  }
  return by;
}

export function planMove(before, after, line) {
  if (!before || !after || !Number.isInteger(line)) return null;
  const side = turn(before);
  const played = play(before, line, side).state;
  if (!played || played.next !== after.next) return null;
  if (played.lines.some((one, at) => one !== after.lines[at]) || played.boxes.some((one, at) => one !== after.boxes[at])) return null;
  return { line, side, closed: boxesOf(line).filter((box) => before.boxes[box] === null && after.boxes[box] !== null) };
}

export const durationOf = (plan) => (plan.closed.length ? popAt(plan.closed.length - 1) + Math.max(POP_MS, BURST_MS) : STROKE_MS);

export function moveFrame(plan, elapsed) {
  const bursts = [];
  plan.closed.forEach((box, at) => {
    const progress = (elapsed - popAt(at)) / BURST_MS;
    if (progress > 0 && progress < 1) bursts.push({ box, side: plan.side, progress });
  });
  return {
    stroke: clamp(elapsed / STROKE_MS),
    pops: plan.closed.map((box, at) => ({ box, progress: clamp((elapsed - popAt(at)) / POP_MS) })),
    bursts,
    done: elapsed >= durationOf(plan),
  };
}

export function cuesBetween(plan, from, to) {
  return plan.closed.map((_, at) => popAt(at)).filter((at) => at > from && at <= to).map(() => "claim");
}

export function extraTurn(state, last) {
  if (!Number.isInteger(last) || !state.lines[last] || result(state)) return [];
  return boxesOf(last).filter((box) => state.boxes[box] !== null);
}
