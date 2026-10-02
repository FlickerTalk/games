// The rules of Four in a Row, as the kit asks for them (README, "A game"). Side 0 starts the round.
// A move is a column, 0 to 6; the disc falls to the lowest free cell. Cells are numbered row by
// row from the top, so the bottom row is 35 to 41. Pure: a state in, a new state (or the reason
// it is refused) out.

export const COLUMNS = 7;
export const ROWS = 6;

/** Every four cells in a line: across, down, and both diagonals. */
const FOURS = [];
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLUMNS; col += 1) {
    for (const [down, across] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const [endRow, endCol] = [row + 3 * down, col + 3 * across];
      if (endRow < ROWS && endCol >= 0 && endCol < COLUMNS) FOURS.push([0, 1, 2, 3].map((k) => (row + k * down) * COLUMNS + col + k * across));
    }
  }
}

export function initial() {
  return { cells: Array(COLUMNS * ROWS).fill(null) };
}

/** The side to move: 0 when both have played as often, else 1. */
export function turn(state) {
  return state.cells.filter((cell) => cell !== null).length % 2;
}

/** The cell a disc dropped into `column` lands on, or -1 when the column is full. */
export function landing(cells, column) {
  for (let row = ROWS - 1; row >= 0; row -= 1) if (cells[row * COLUMNS + column] === null) return row * COLUMNS + column;
  return -1;
}

/** How the round stands: null while it goes on; the winner and every cell of its fours; or a draw. */
export function result(state) {
  const { cells } = state;
  const line = new Set();
  let winner = null;
  for (const four of FOURS) {
    const side = cells[four[0]];
    if (side !== null && four.every((cell) => cells[cell] === side)) {
      winner = side;
      for (const cell of four) line.add(cell);
    }
  }
  if (line.size) return { winner, line: [...line].sort((a, b) => a - b) };
  if (cells.every((cell) => cell !== null)) return { winner: null, line: null };
  return null;
}

export function play(state, move, side) {
  if (!Number.isInteger(move) || move < 0 || move >= COLUMNS) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  const cell = landing(state.cells, move);
  if (cell < 0) return { error: "full" };
  const cells = [...state.cells];
  cells[cell] = side;
  return { state: { cells } };
}
