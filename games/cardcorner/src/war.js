import { warValue } from "./card.js";

export const LIMIT = 40;
const FACE_DOWN = 3;

export function deal(deck) {
  const piles = [[], []];
  deck.forEach((one, at) => piles[at % 2 === 0 ? 1 : 0].unshift(one));
  return { table: { piles, pot: [[], []], open: [[], []], up: [null, null], war: false, battles: 0, last: null }, next: 1 };
}

const counts = (table) => table.piles.map((pile) => pile.length);

function finished(table, reason) {
  const [a, b] = counts(table);
  return { winner: a === b ? null : a > b ? 0 : 1, reason, cards: [a, b] };
}

function settle(table) {
  const [mine, theirs] = table.up.map(warValue);
  const last = { pot: table.pot, open: table.open, winner: mine === theirs ? null : mine > theirs ? 0 : 1 };
  if (last.winner === null) {
    const tied = { ...table, up: [null, null], war: true, last };
    return counts(tied).includes(0) ? { table: tied, next: 1, end: finished(tied, "all") } : { table: tied, next: 1 };
  }
  const won = [...table.pot[last.winner], ...table.pot[1 - last.winner]];
  const piles = table.piles.map((pile, side) => (side === last.winner ? [...won, ...pile] : pile));
  const next = { ...table, piles, pot: [[], []], open: [[], []], up: [null, null], war: false, battles: table.battles + 1, last };
  if (counts(next).includes(0)) return { table: next, next: 1, end: finished(next, "all") };
  if (next.battles >= LIMIT) return { table: next, next: 1, end: finished(next, "limit") };
  return { table: next, next: 1 };
}

export function play(table, move, side) {
  if (move !== "f") return { error: "bad" };
  if (table.up[side] !== null || !table.piles[side].length) return { error: "illegal" };
  const pile = [...table.piles[side]];
  const laid = [];
  const down = table.war ? Math.min(FACE_DOWN, pile.length - 1) : 0;
  for (let at = 0; at <= down; at += 1) laid.push(pile.pop());
  const shown = laid.at(-1);
  const put = (lists, added) => lists.map((list, who) => (who === side ? [...list, ...added] : list));
  const next = { ...table, piles: table.piles.map((one, who) => (who === side ? pile : one)), pot: put(table.pot, laid), open: put(table.open, [shown]), up: table.up.map((one, who) => (who === side ? shown : one)) };
  return next.up[1 - side] === null ? { table: next, next: 1 - side } : settle(next);
}
