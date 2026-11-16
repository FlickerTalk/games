import { rankOf, isRed, sameKind } from "./card.js";

export const SIZES = [16, 24];

const kindOf = (one) => rankOf(one) * 2 + (isRed(one) ? 1 : 0);

export function deal(deck, size) {
  const kinds = [];
  for (const one of deck) {
    if (kinds.length === size / 2) break;
    if (!kinds.includes(kindOf(one))) kinds.push(kindOf(one));
  }
  const cards = deck.filter((one) => kinds.includes(kindOf(one)));
  return { table: { cards, owner: cards.map(() => null), up: [], miss: false, won: [0, 0], seen: [], took: null }, next: 1 };
}

function ended(table) {
  if (table.owner.some((one) => one === null)) return null;
  const [a, b] = table.won;
  return { winner: a === b ? null : a > b ? 0 : 1, reason: "pairs", pairs: [a, b] };
}

export function play(table, move, side) {
  const found = /^f(\d{1,2})$/.exec(move);
  if (!found) return { error: "bad" };
  const at = Number(found[1]);
  const up = table.miss ? [] : [...table.up];
  if (at >= table.cards.length || table.owner[at] !== null || up.includes(at)) return { error: "illegal" };
  up.push(at);
  const seen = table.seen.includes(at) ? table.seen : [...table.seen, at];
  const next = { ...table, up, miss: false, seen, took: null };
  if (up.length < 2) return { table: next, next: side };
  if (!sameKind(table.cards[up[0]], table.cards[up[1]])) return { table: { ...next, miss: true }, next: 1 - side };
  next.owner = table.owner.map((one, index) => (up.includes(index) ? side : one));
  next.won = table.won.map((count, who) => count + (who === side ? 1 : 0));
  next.took = up;
  next.up = [];
  const end = ended(next);
  return end ? { table: next, next: side, end } : { table: next, next: side };
}
