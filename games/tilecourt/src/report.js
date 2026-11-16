import { SEED_LENGTH, isSeed } from "../../../kit/src/canvas/random.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const ORDERS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];
const TRAY = 3;
const TRAYS = 12;

export const MOST = SEED_LENGTH + TRAYS * (TRAY + 1);

const orderOf = (slots) => ORDERS.findIndex((order) => slots.every((slot, at) => order[at] === slot));

export function encodeReport(round) {
  let text = round.seed;
  for (let start = 0; start < round.placements.length; start += TRAY) {
    const group = round.placements.slice(start, start + TRAY);
    text += LETTERS[orderOf(group.map(([slot]) => slot))];
    for (const [, at] of group) text += LETTERS[at];
  }
  return text;
}

function readGroups(body) {
  const placements = [];
  for (let start = 0; start < body.length; start += TRAY + 1) {
    const order = ORDERS[LETTERS.indexOf(body[start])];
    const cells = [...body.slice(start + 1, start + TRAY + 1)].map((letter) => LETTERS.indexOf(letter));
    if (!order || !cells.length || cells.includes(-1)) return null;
    cells.forEach((at, index) => placements.push([order[index], at]));
  }
  return placements;
}

export function decodeReport(text) {
  if (typeof text !== "string" || text.length > MOST) return null;
  const seed = text.slice(0, SEED_LENGTH);
  if (!isSeed(seed)) return null;
  const placements = readGroups(text.slice(SEED_LENGTH));
  return placements && { seed, placements };
}
