const ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];

export const robot = {
  moves: (state) => ORDER.filter((cell) => state.cells[cell] === null),
  score: () => 0,
  depth: 9,
};
