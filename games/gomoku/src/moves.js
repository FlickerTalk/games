import { play, turn } from "./rules.js";

export const ENTER_MS = 300;
export const POP_MS = 500;
export const LINE_MS = 800;
export const CHEER_MS = 2400;
const CHEER_FADE_MS = 400;

const clamp = (value) => Math.min(1, Math.max(0, value));

export function planMove(before, after, move) {
  if (!before || !after || !Number.isInteger(move)) return null;
  const side = turn(before);
  const played = play(before, move, side).state;
  if (!played || played.count !== after.count || played.cells.some((one, at) => one !== after.cells[at])) return null;
  return { cell: move, side, line: after.line ?? null };
}

export const durationOf = (plan) => (plan.line ? ENTER_MS + LINE_MS + CHEER_MS : Math.max(ENTER_MS, POP_MS));

export function moveFrame(plan, elapsed) {
  const end = durationOf(plan);
  const cheering = plan.line && elapsed >= ENTER_MS;
  return {
    enter: clamp(elapsed / ENTER_MS),
    pop: elapsed < POP_MS ? clamp(elapsed / POP_MS) : null,
    line: plan.line ? clamp((elapsed - ENTER_MS) / LINE_MS) : null,
    cheer: cheering ? clamp((end - elapsed) / CHEER_FADE_MS) : 0,
    done: elapsed >= end,
  };
}
