import { PITS, STORE, inPits, pitOf } from "./rules.js";

const STORED = 4;
const ROUND = 2 * PITS + 1;

function score(state, side) {
  const stored = state.pits[STORE[side]] - state.pits[STORE[1 - side]];
  return STORED * stored + inPits(state.pits, side) - inPits(state.pits, 1 - side);
}

function moves(state, side) {
  const full = [];
  for (let n = PITS - 1; n >= 0; n -= 1) if (state.pits[pitOf(side, n)] > 0) full.push(n);
  const home = (n) => state.pits[pitOf(side, n)] % ROUND === PITS - n;
  return [...full.filter(home), ...full.filter((n) => !home(n))];
}

export const robot = {
  moves,
  score,
  depth: 12,
  budgetMs: 250,
};
