// Both phones lay the same trays at the same time; each sends its whole round as one move once it
// ends, the round's starter first, and the score is worked out again here from the placements.

import { decodeReport } from "./report.js";
import { replayRound } from "./round.js";

export function initial() {
  return { seed: null, results: [null, null] };
}

export function turn(state) {
  return state.results[0] === null ? 0 : 1;
}

export function result(state) {
  const [one, two] = state.results;
  if (!one || !two) return null;
  return { winner: one.score === two.score ? null : one.score > two.score ? 0 : 1 };
}

export function play(state, move, side) {
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  const report = decodeReport(move);
  if (!report) return { error: "bad" };
  if (state.seed !== null && report.seed !== state.seed) return { error: "seed" };
  const round = replayRound({ seed: report.seed, placements: report.placements });
  if (!round?.over) return { error: "unfinished" };
  const results = [...state.results];
  results[side] = { score: round.score, done: round.over === "done", lines: round.lines };
  return { state: { seed: report.seed, results } };
}
