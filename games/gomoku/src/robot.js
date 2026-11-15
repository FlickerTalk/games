import { CELLS, FIVE, SIZE } from "./rules.js";

const CENTRE = Math.floor(CELLS / 2);
const REACH = 2;
const KEEP = 16;
const WEIGHT = [0, 1, 8, 64, 512];
const ATTACK = [1, 10, 100, 10_000, 10_000_000];
const DEFEND = [0, 5, 50, 5_000, 1_000_000];
const SOON = 100_000;

function windows() {
  const found = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const last = [row + dr * (FIVE - 1), col + dc * (FIVE - 1)];
        if (last[0] >= SIZE || last[1] < 0 || last[1] >= SIZE) continue;
        found.push(Array.from({ length: FIVE }, (_, step) => (row + dr * step) * SIZE + col + dc * step));
      }
    }
  }
  return found;
}

const WINDOWS = windows();
const THROUGH = Array.from({ length: CELLS }, () => []);
for (const window of WINDOWS) for (const cell of window) THROUGH[cell].push(window);

function score(state, side) {
  const lines = [0, 0];
  const fives = [new Set(), new Set()];
  for (const window of WINDOWS) {
    const stones = [0, 0];
    let gap = -1;
    for (const cell of window) {
      const stone = state.cells[cell];
      if (stone === null) gap = cell;
      else stones[stone] += 1;
    }
    if (stones[0] && stones[1]) continue;
    const owner = stones[0] ? 0 : 1;
    lines[owner] += WEIGHT[stones[owner]];
    if (stones[owner] === FIVE - 1) fives[owner].add(gap);
  }
  const toPlay = state.count % 2;
  let edge = 0;
  if (fives[toPlay].size) edge = SOON;
  else if (fives[1 - toPlay].size > 1) edge = -SOON;
  return (toPlay === side ? edge : -edge) + lines[side] - lines[1 - side];
}

function urgency(cells, cell, side) {
  let total = 0;
  for (const window of THROUGH[cell]) {
    let mine = 0;
    let theirs = 0;
    for (const one of window) {
      if (cells[one] === side) mine += 1;
      else if (cells[one] !== null) theirs += 1;
    }
    if (!theirs) total += ATTACK[mine];
    else if (!mine) total += DEFEND[theirs];
  }
  return total;
}

function near(cells) {
  const found = new Set();
  cells.forEach((stone, cell) => {
    if (stone === null) return;
    const [row, col] = [Math.floor(cell / SIZE), cell % SIZE];
    for (let r = Math.max(0, row - REACH); r <= Math.min(SIZE - 1, row + REACH); r += 1) {
      for (let c = Math.max(0, col - REACH); c <= Math.min(SIZE - 1, col + REACH); c += 1) {
        if (cells[r * SIZE + c] === null) found.add(r * SIZE + c);
      }
    }
  });
  return found;
}

function moves(state, side) {
  if (state.count === 0) return [CENTRE];
  return [...near(state.cells)]
    .map((cell) => ({ cell, value: urgency(state.cells, cell, side) }))
    .sort((one, two) => two.value - one.value)
    .slice(0, KEEP)
    .map(({ cell }) => cell);
}

export const robot = {
  moves,
  score,
  depth: 4,
  budgetMs: 250,
  slack: 4,
};
