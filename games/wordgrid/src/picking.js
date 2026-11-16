import { CELLS, SIZE } from "./rules.js";

const ALL = Array.from({ length: CELLS }, (_, cell) => cell);

export const touching = (a, b) => a !== b && Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) <= 1 && Math.abs((a % SIZE) - (b % SIZE)) <= 1;

export function nextCells(path, open) {
  if (!open) return [];
  const last = path.at(-1);
  return last === undefined ? ALL : ALL.filter((cell) => !path.includes(cell) && touching(last, cell));
}

export function tap(path, cell) {
  const at = path.indexOf(cell);
  return at >= 0 ? path.slice(0, at) : [...path, cell];
}

export const wordOf = (grid, path) => path.map((cell) => grid[cell]).join("");
