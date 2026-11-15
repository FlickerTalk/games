import { moves } from "./rules.js";

const WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];
const CORNER_OF = { 1: 0, 8: 0, 9: 0, 6: 7, 14: 7, 15: 7, 48: 56, 49: 56, 57: 56, 54: 63, 55: 63, 62: 63 };
const NEXT_TO_TAKEN_CORNER = 5;
const MOBILITY = 5;

function worth(cells, cell) {
  const corner = CORNER_OF[cell];
  return corner !== undefined && cells[corner] !== null ? NEXT_TO_TAKEN_CORNER : WEIGHTS[cell];
}

function score(state, side) {
  let total = 0;
  state.cells.forEach((disc, cell) => {
    if (disc === side) total += worth(state.cells, cell);
    else if (disc !== null) total -= worth(state.cells, cell);
  });
  return total + MOBILITY * (moves(state.cells, side).length - moves(state.cells, 1 - side).length);
}

export const robot = {
  moves: (state, side) => moves(state.cells, side).sort((one, two) => WEIGHTS[two] - WEIGHTS[one]),
  score,
  depth: 4,
  slack: 2,
};
