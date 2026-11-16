import { decodeLevel } from "./level.js";
import { countOf, decodeProgram } from "./program.js";
import { runProgram } from "./run.js";
import { shortest } from "./solver.js";

const initial = () => ({ level: null, program: null });

const turn = (state) => (state.level === null ? 0 : 1);

function result(state) {
  if (!state.program) return null;
  return { winner: null, count: countOf(decodeProgram(state.program)), best: shortest(decodeLevel(state.level)).length };
}

function play(state, move, side) {
  if (state.program) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.level === null) {
    const level = decodeLevel(move);
    if (!level) return { error: "bad" };
    return shortest(level) ? { state: { level: move, program: null } } : { error: "unsolvable" };
  }
  const items = decodeProgram(move);
  if (!items) return { error: "bad" };
  if (runProgram(decodeLevel(state.level), items).end !== "goal") return { error: "unsolved" };
  return { state: { level: state.level, program: move } };
}

export const DUEL_RULES = Object.freeze({ id: "beeproute", gv: 1, initial, turn, play, result });
