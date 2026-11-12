// A move is a cell, 0–8, row by row.

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function initial() {
  return { cells: Array(9).fill(null) };
}

export function turn(state) {
  return state.cells.filter((cell) => cell !== null).length % 2;
}

export function result(state) {
  for (const line of LINES) {
    const [a, b, c] = line;
    const side = state.cells[a];
    if (side !== null && side === state.cells[b] && side === state.cells[c]) return { winner: side, line };
  }
  if (state.cells.every((cell) => cell !== null)) return { winner: null, line: null };
  return null;
}

export function play(state, move, side) {
  if (!Number.isInteger(move) || move < 0 || move > 8) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.cells[move] !== null) return { error: "taken" };
  const cells = [...state.cells];
  cells[move] = side;
  return { state: { cells } };
}
