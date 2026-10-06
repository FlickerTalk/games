// The rules of dots and boxes, as the kit asks for them (README, "A game"). Five by five dots make
// four by four boxes; a move draws one of the 40 lines between two dots, numbered row by row from
// the top: the horizontal lines first (0 to 19, five rows of four), then the vertical ones (20 to
// 39, four rows of five). Whoever draws the fourth side of a box takes it and moves again. When
// every line is drawn, the side with more boxes wins. Side 0 starts the round. Pure: a state in, a
// new state (or the reason it is refused) out.

export const BOXES = 4;
export const DOTS = BOXES + 1;
export const H = DOTS * BOXES; // horizontal lines
export const LINES = 2 * H;

/** The four lines around a box: top, bottom, left, right. */
export function sidesOf(box) {
  const row = Math.floor(box / BOXES);
  const col = box % BOXES;
  return [row * BOXES + col, (row + 1) * BOXES + col, H + row * DOTS + col, H + row * DOTS + col + 1];
}

/** The boxes a line borders: one at an edge of the board, two inside. */
export function boxesOf(line) {
  const boxes = [];
  for (let box = 0; box < BOXES * BOXES; box += 1) if (sidesOf(box).includes(line)) boxes.push(box);
  return boxes;
}

export function initial() {
  return { lines: Array(LINES).fill(false), boxes: Array(BOXES * BOXES).fill(null), next: 0 };
}

export function turn(state) {
  return state.next;
}

/** How many boxes each side has. */
export function count(boxes) {
  return [boxes.filter((owner) => owner === 0).length, boxes.filter((owner) => owner === 1).length];
}

/** How the round stands: null while a line is free; else who has more boxes, or a draw. */
export function result(state) {
  if (state.lines.some((drawn) => !drawn)) return null;
  const [first, second] = count(state.boxes);
  return { winner: first === second ? null : first > second ? 0 : 1, first, second };
}

export function play(state, move, side) {
  if (!Number.isInteger(move) || move < 0 || move >= LINES) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.lines[move]) return { error: "taken" };
  const lines = [...state.lines];
  lines[move] = true;
  const boxes = [...state.boxes];
  let closed = false;
  for (const box of boxesOf(move)) {
    if (boxes[box] === null && sidesOf(box).every((line) => lines[line])) {
      boxes[box] = side;
      closed = true;
    }
  }
  // A box closed gives the turn again; else the other side draws.
  return { state: { lines, boxes, next: closed ? side : 1 - side } };
}
