import { PIECES } from "./pieces.js";

const ALL = Object.freeze(PIECES.map((piece) => piece.id));
const SMALL = Object.freeze(PIECES.filter((piece) => piece.cells.length <= 4).map((piece) => piece.id));

const variant = (id, fields) => Object.freeze({ id, size: 8, tray: 3, trays: 12, beds: false, rescue: false, pool: ALL, ...fields });

export const VARIANTS = Object.freeze({
  main: variant("main", {}),
  small: variant("small", { size: 6, tray: 1, rescue: true, pool: SMALL }),
  big: variant("big", { size: 9, beds: true }),
  daily: variant("daily", {}),
});

export const variantOf = (id) => VARIANTS[id] ?? VARIANTS.main;
