import { FOURS, landing } from "./rules.js";

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const WEIGHT = [0, 1, 4, 32, 256];

function score(state, side) {
  let total = 0;
  for (const four of FOURS) {
    let mine = 0;
    let theirs = 0;
    for (const cell of four) {
      const disc = state.cells[cell];
      if (disc === side) mine += 1;
      else if (disc !== null) theirs += 1;
    }
    if (!theirs) total += WEIGHT[mine];
    else if (!mine) total -= WEIGHT[theirs];
  }
  return total;
}

export const robot = {
  moves: (state) => ORDER.filter((column) => landing(state.cells, column) >= 0),
  score,
  depth: 6,
  slack: 2,
};
