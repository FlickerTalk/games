import { PITS, pitOf, result } from "./rules.js";

const ALL = Array.from({ length: PITS }, (_, n) => n);

export function openPits(state, side, canPlay) {
  if (!canPlay || (side !== 0 && side !== 1) || result(state)) return [];
  return ALL.filter((n) => state.pits[pitOf(side, n)] > 0);
}

export const pick = (state, side, canPlay, n) => (openPits(state, side, canPlay).includes(n) ? n : null);
