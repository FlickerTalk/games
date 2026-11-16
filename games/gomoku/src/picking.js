export function tap(cells, chosen, cell) {
  if (cells[cell] !== null) return { chosen, move: null, miss: true };
  if (cell === chosen) return { chosen: null, move: cell, miss: false };
  return { chosen: cell, move: null, miss: false };
}

export function confirm(cells, chosen) {
  const free = chosen !== null && chosen !== undefined && cells[chosen] === null;
  return { chosen: null, move: free ? chosen : null, miss: false };
}
