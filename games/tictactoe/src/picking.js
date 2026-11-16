export function openCells(state, canPlay) {
  return canPlay ? state.cells.flatMap((one, cell) => (one === null ? [cell] : [])) : [];
}

export function pick(state, canPlay, cell) {
  if (!canPlay || !(cell in state.cells)) return null;
  return state.cells[cell] === null ? { move: cell } : { miss: cell };
}
