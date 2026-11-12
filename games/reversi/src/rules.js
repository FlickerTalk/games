// A move is a cell, 0–63, row by row from the top left.

export const SIZE = 8;
const CELLS = SIZE * SIZE;
const DIRECTIONS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export function initial() {
  const cells = Array(CELLS).fill(null);
  cells[27] = 1;
  cells[28] = 0;
  cells[35] = 0;
  cells[36] = 1;
  return { cells, next: 0 };
}

export function turn(state) {
  return state.next;
}

export function flips(cells, cell, side) {
  if (cells[cell] !== null) return [];
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const turned = [];
  for (const [dr, dc] of DIRECTIONS) {
    const run = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === 1 - side) {
      run.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (run.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === side) turned.push(...run);
  }
  return turned;
}

export function moves(cells, side) {
  const legal = [];
  for (let cell = 0; cell < CELLS; cell += 1) if (flips(cells, cell, side).length) legal.push(cell);
  return legal;
}

export function count(cells) {
  return [cells.filter((cell) => cell === 0).length, cells.filter((cell) => cell === 1).length];
}

export function result(state) {
  const { cells } = state;
  if (moves(cells, 0).length || moves(cells, 1).length) return null;
  const [dark, light] = count(cells);
  return { winner: dark === light ? null : dark > light ? 0 : 1, dark, light };
}

export function play(state, move, side) {
  if (!Number.isInteger(move) || move < 0 || move >= CELLS) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  const turned = flips(state.cells, move, side);
  if (!turned.length) return { error: "illegal" };
  const cells = [...state.cells];
  cells[move] = side;
  for (const cell of turned) cells[cell] = side;
  const other = 1 - side;
  const next = moves(cells, other).length ? other : side;
  return { state: { cells, next } };
}
