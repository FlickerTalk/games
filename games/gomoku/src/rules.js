// Five or more in a line win. A move is an intersection, 0–224, row by row from the top left.

export const SIZE = 15;
export const CELLS = SIZE * SIZE;
export const FIVE = 5;
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function initial() {
  return { cells: Array(CELLS).fill(null), count: 0 };
}

export function turn(state) {
  return state.count % 2;
}

export function lineThrough(cells, cell, side) {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  for (const [dr, dc] of DIRECTIONS) {
    const line = [cell];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === side) {
        line.push(r * SIZE + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= FIVE) return line.sort((a, b) => a - b);
  }
  return null;
}

export function result(state) {
  if (state.line) return { winner: state.cells[state.line[0]], line: state.line };
  if (state.count >= CELLS) return { winner: null };
  return null;
}

export function play(state, move, side) {
  if (!Number.isInteger(move) || move < 0 || move >= CELLS) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.cells[move] !== null) return { error: "illegal" };
  const cells = [...state.cells];
  cells[move] = side;
  const next = { cells, count: state.count + 1 };
  const line = lineThrough(cells, move, side);
  if (line) next.line = line;
  return { state: next };
}
