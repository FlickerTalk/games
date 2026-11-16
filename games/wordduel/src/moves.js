import { easeInOut, progressOf } from "../../../kit/src/tabletop/motion.js";

export const FLIP_MS = 300;
export const STAGGER_MS = 110;
const LAST = 4;

const GRIDS = ["mine", "theirs", "secret"];

export function newlyAnswered(before, after) {
  if (!before) return [];
  return GRIDS.flatMap((grid) => (after[grid] ?? []).flatMap((answer, row) => (answer && !before[grid]?.[row] ? [{ grid, row }] : [])));
}

export const flipAt = (elapsed, column) => easeInOut(progressOf(column * STAGGER_MS, FLIP_MS, elapsed));

export const flipsOver = (elapsed) => elapsed >= LAST * STAGGER_MS + FLIP_MS;
