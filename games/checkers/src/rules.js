// The rules of checkers (English draughts), as the kit asks for them (README, "A game"). Side 0
// plays the dark pieces, on the top rows at the start, and starts the round; side 1 the light
// ones. Only the dark squares are played. A man moves one square diagonally forward; a king, one
// square in any diagonal. A piece captures by jumping over an adjacent enemy to the empty square
// beyond, and goes on jumping with the same piece while it can; capturing is compulsory (any
// capture, not the longest). A man reaching the far row is crowned, and its move ends there. A
// side with no move loses; 50 moves in a row by kings without a capture are a draw. A move is a
// string of the squares it touches, 0 to 63 joined by "-": "17-26", or "17-35-53" for two jumps.
// Pure: a state in, a new state (or the reason it is refused) out.
//
// A cell holds null, or 0 (a dark man), 1 (a light man), 2 (a dark king) or 3 (a light king).

export const SIZE = 8;
const CELLS = SIZE * SIZE;
/** How many king moves in a row without a capture make a draw. */
export const QUIET_LIMIT = 50;

export const isDark = (cell) => (Math.floor(cell / SIZE) + (cell % SIZE)) % 2 === 1;
export const sideOf = (piece) => (piece === null ? null : piece % 2);
export const isKing = (piece) => piece !== null && piece >= 2;

export function initial() {
  const cells = Array(CELLS).fill(null);
  for (let cell = 0; cell < CELLS; cell += 1) {
    if (!isDark(cell)) continue;
    const row = Math.floor(cell / SIZE);
    if (row < 3) cells[cell] = 0;
    if (row > 4) cells[cell] = 1;
  }
  return { cells, next: 0, quiet: 0 };
}

export function turn(state) {
  return state.next;
}

/** Where a piece may step or jump: men forward only (down the board for side 0), kings anywhere. */
function directions(piece) {
  const side = sideOf(piece);
  if (isKing(piece)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return side === 0 ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
}

const at = (row, col) => (row >= 0 && row < SIZE && col >= 0 && col < SIZE ? row * SIZE + col : -1);
const crownRow = (side) => (side === 0 ? SIZE - 1 : 0);

/** Every capture sequence from `cell` for `piece`, each as the squares it lands on. */
function jumpsFrom(cells, cell, piece, taken) {
  const side = sideOf(piece);
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const sequences = [];
  for (const [dr, dc] of directions(piece)) {
    const over = at(row + dr, col + dc);
    const land = at(row + 2 * dr, col + 2 * dc);
    if (over < 0 || land < 0 || cells[land] !== null || taken.includes(over)) continue;
    if (cells[over] === null || sideOf(cells[over]) === side) continue;
    // A man crowned on landing stops there.
    const crowned = !isKing(piece) && Math.floor(land / SIZE) === crownRow(side);
    const further = crowned ? [] : jumpsFrom(cells, land, piece, [...taken, over]);
    if (further.length) for (const rest of further) sequences.push([land, ...rest]);
    else sequences.push([land]);
  }
  return sequences;
}

/** Every move `side` may make: the captures when there are any, else the plain steps. */
export function legalMoves(state, side) {
  const { cells } = state;
  const captures = [];
  const steps = [];
  for (let cell = 0; cell < CELLS; cell += 1) {
    const piece = cells[cell];
    if (piece === null || sideOf(piece) !== side) continue;
    const taken = cells.map((one, index) => (index === cell ? null : one));
    for (const landings of jumpsFrom(taken, cell, piece, [])) captures.push([cell, ...landings].join("-"));
    if (captures.length) continue;
    const row = Math.floor(cell / SIZE);
    const col = cell % SIZE;
    for (const [dr, dc] of directions(piece)) {
      const to = at(row + dr, col + dc);
      if (to >= 0 && cells[to] === null) steps.push(`${cell}-${to}`);
    }
  }
  return captures.length ? captures : steps;
}

/** The squares a move touches, or null when it is not a move at all. */
export function squaresOf(move) {
  if (typeof move !== "string" || !/^\d{1,2}(-\d{1,2})+$/.test(move)) return null;
  const squares = move.split("-").map(Number);
  return squares.every((square) => square >= 0 && square < CELLS) ? squares : null;
}

/** How many pieces each side has: `[dark, light]`. */
export function count(cells) {
  return [cells.filter((piece) => sideOf(piece) === 0).length, cells.filter((piece) => sideOf(piece) === 1).length];
}

/** How the round stands: null while it goes on; the winner when the side to move is stuck; a draw after too many quiet moves. */
export function result(state) {
  const [dark, light] = count(state.cells);
  if (state.quiet >= QUIET_LIMIT) return { winner: null, dark, light, how: "quiet" };
  if (legalMoves(state, state.next).length === 0) return { winner: 1 - state.next, dark, light, how: dark === 0 || light === 0 ? "captured" : "stuck" };
  return null;
}

export function play(state, move, side) {
  const squares = squaresOf(move);
  if (!squares) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (!legalMoves(state, side).includes(squares.join("-"))) return { error: "illegal" };
  const cells = [...state.cells];
  let piece = cells[squares[0]];
  cells[squares[0]] = null;
  let captured = false;
  for (let i = 1; i < squares.length; i += 1) {
    const [from, to] = [squares[i - 1], squares[i]];
    const [fr, fc, tr, tc] = [Math.floor(from / SIZE), from % SIZE, Math.floor(to / SIZE), to % SIZE];
    if (Math.abs(tr - fr) === 2) {
      cells[at((fr + tr) / 2, (fc + tc) / 2)] = null;
      captured = true;
    }
  }
  const to = squares.at(-1);
  if (!isKing(piece) && Math.floor(to / SIZE) === crownRow(side)) piece += 2;
  cells[to] = piece;
  const quiet = captured || !isKing(state.cells[squares[0]]) ? 0 : state.quiet + 1;
  return { state: { cells, next: 1 - side, quiet } };
}
