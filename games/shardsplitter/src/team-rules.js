import { decodeSetup, generateRound } from "./generate.js";
import { clinksOf, startRound, strike, turnOf } from "./round.js";

const initial = () => ({ code: null, round: null });

const turn = (state) => (state.round ? (turnOf(state.round) ?? 0) : 0);

const result = (state) => (state.round?.over ? { winner: null, clinks: clinksOf(state.round) } : null);

function play(state, move, side) {
  if (state.round?.over) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (!state.round) {
    const setup = decodeSetup(move);
    return setup?.team ? { state: { code: move, round: startRound(generateRound(setup)) } } : { error: "bad" };
  }
  if (!Number.isInteger(move)) return { error: "bad" };
  const done = strike(state.round, side, move);
  return done.event ? { state: { code: state.code, round: done.round } } : { error: "bad" };
}

export const TEAM_RULES = Object.freeze({ id: "shardsplitter", gv: 1, initial, turn, play, result });
