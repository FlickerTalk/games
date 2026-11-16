import { CELLS } from "./rules.js";

export function openCells(state, side) {
  const fired = new Set(state.shots[side]);
  return new Set([...Array(CELLS).keys()].filter((cell) => !fired.has(cell)));
}

export function aim(chosen, cell, open) {
  if (!open.has(cell)) return { chosen, fire: null };
  return cell === chosen ? { chosen: null, fire: cell } : { chosen: cell, fire: null };
}

export function confirm(chosen, open) {
  return { chosen: null, fire: chosen !== null && open.has(chosen) ? chosen : null };
}
