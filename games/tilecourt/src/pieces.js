export const familyOf = (count) => (count <= 2 ? 0 : count === 3 ? 1 : count === 4 ? 2 : 3);

function shapeOf(id, cells) {
  const width = Math.max(...cells.map(([x]) => x)) + 1;
  const height = Math.max(...cells.map(([, y]) => y)) + 1;
  return Object.freeze({ id, cells: Object.freeze(cells.map((cell) => Object.freeze(cell))), width, height, family: familyOf(cells.length) });
}

function define(id, rows) {
  const cells = [];
  rows.forEach((row, y) => [...row].forEach((mark, x) => mark === "#" && cells.push([x, y])));
  return shapeOf(id, cells);
}

export const PIECES = Object.freeze([
  define("single", ["#"]),
  define("domino-h", ["##"]),
  define("domino-v", ["#", "#"]),
  define("triple-h", ["###"]),
  define("triple-v", ["#", "#", "#"]),
  define("corner-nw", ["##", "#."]),
  define("corner-ne", ["##", ".#"]),
  define("corner-sw", ["#.", "##"]),
  define("corner-se", [".#", "##"]),
  define("square", ["##", "##"]),
  define("four-h", ["####"]),
  define("four-v", ["#", "#", "#", "#"]),
  define("tee-up", ["###", ".#."]),
  define("tee-right", [".#", "##", ".#"]),
  define("tee-down", [".#.", "###"]),
  define("tee-left", ["#.", "##", "#."]),
  define("ell-up", ["##", "#.", "#."]),
  define("ell-right", ["###", "..#"]),
  define("ell-down", [".#", ".#", "##"]),
  define("ell-left", ["#..", "###"]),
  define("six-h", ["###", "###"]),
  define("six-v", ["##", "##", "##"]),
  define("pee-h", ["##", "##", "#."]),
  define("pee-v", ["###", "##."]),
  define("you-h", ["#.#", "###"]),
  define("you-v", ["##", "#.", "##"]),
]);

const BY_ID = new Map(PIECES.map((piece) => [piece.id, piece]));

export const pieceOf = (id) => BY_ID.get(id) ?? null;

export function rotated(piece, turns) {
  let cells = piece.cells.map(([x, y]) => [x, y]);
  let height = piece.height;
  for (let turn = 0; turn < (((turns % 4) + 4) % 4); turn += 1) {
    cells = cells.map(([x, y]) => [height - 1 - y, x]);
    height = Math.max(...cells.map(([, y]) => y)) + 1;
  }
  return shapeOf(piece.id, cells);
}
