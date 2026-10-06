// The rules of Five in a Row, as the kit asks for them (README, "A game"). Fifteen by fifteen
// intersections; side 0 plays the black stones and starts the round, side 1 the white ones. A move
// is an intersection, 0 to 224, row by row from the top left, and must be empty. The first side
// to line up five or more stones, in a row, a column or a diagonal, wins; a full board is a draw.
// Pure: a state in, a new state (or the reason it is refused) out.

export const SIZE = 15;
export const CELLS = SIZE * SIZE;
/** How many in a line win. */
export const FIVE = 5;
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function initial() {
  return { cells: Array(CELLS).fill(null), count: 0 };
}

/** The side to move: black on even moves, white on odd. */
export function turn(state) {
  return state.count % 2;
}

/** The stones of `side` in a line of five or more through `cell`, or null. */
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

/** How the round stands: null while it goes on; the winner with the line, or a draw on a full board. */
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
