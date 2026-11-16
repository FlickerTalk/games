const FILES = "abcdefgh";
const NAME = /^([a-h])([1-8])$/;

export const SIDE = 8;

export function cellsOf(fen) {
  const cells = [];
  for (const mark of fen.slice(0, fen.indexOf(" ")).replaceAll("/", "")) {
    if (mark >= "1" && mark <= "8") cells.push(...Array(Number(mark)).fill(null));
    else cells.push(mark);
  }
  return cells;
}

export const nameOf = (cell) => `${FILES[cell % SIDE]}${SIDE - Math.floor(cell / SIDE)}`;

export function cellOf(name) {
  const found = NAME.exec(name ?? "");
  return found ? (SIDE - Number(found[2])) * SIDE + FILES.indexOf(found[1]) : null;
}

export const colourOf = (piece) => (piece ? (piece === piece.toUpperCase() ? 0 : 1) : null);

export const typeOf = (piece) => piece.toLowerCase();

export function kingCell(cells, side) {
  const at = cells.indexOf(side === 0 ? "K" : "k");
  return at < 0 ? null : at;
}
