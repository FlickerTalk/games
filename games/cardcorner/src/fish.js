import { rankOf } from "./card.js";

export const HAND = 7;
const RANKS = 13;

function booked(table, side) {
  const hand = table.hands[side];
  const made = [];
  for (let rank = 0; rank < RANKS; rank += 1) if (hand.filter((one) => rankOf(one) === rank).length === 4) made.push(rank);
  if (!made.length) return { table, made };
  const hands = table.hands.map((one, who) => (who === side ? one.filter((held) => !made.includes(rankOf(held))) : one));
  const books = table.books.map((one, who) => (who === side ? [...one, ...made] : one));
  return { table: { ...table, hands, books }, made };
}

export function deal(deck) {
  const hands = [[], []];
  for (let at = 0; at < HAND * 2; at += 1) hands[at % 2 === 0 ? 1 : 0].push(deck[at]);
  let table = { hands, pond: deck.slice(HAND * 2).reverse(), books: [[], []], last: null };
  for (const side of [0, 1]) table = booked(table, side).table;
  return { table, next: 1 };
}

function seated(table, wanted) {
  const [a, b] = table.books.map((one) => one.length);
  if (a + b === RANKS) return { table, next: wanted, end: { winner: a > b ? 0 : 1, reason: "books", books: [a, b] } };
  const stuck = !table.hands[wanted].length && !table.pond.length;
  return { table, next: stuck ? 1 - wanted : wanted };
}

function fish(table, side, rank) {
  const pond = table.pond.slice(0, -1);
  const drawn = table.pond.at(-1);
  const hands = table.hands.map((one, who) => (who === side ? [...one, drawn] : one));
  const lucky = rank !== null && rankOf(drawn) === rank;
  return { table: { ...table, hands, pond, last: { by: side, rank, got: 0, drew: true, card: lucky ? drawn : null, books: [] } }, again: lucky || rank === null };
}

function ask(table, side, rank) {
  const given = table.hands[1 - side].filter((one) => rankOf(one) === rank);
  if (given.length) {
    const hands = table.hands.map((one, who) => (who === side ? [...one, ...given] : one.filter((held) => !given.includes(held))));
    return { table: { ...table, hands, last: { by: side, rank, got: given.length, drew: false, card: null, books: [] } }, again: true };
  }
  if (table.pond.length) return fish(table, side, rank);
  return { table: { ...table, last: { by: side, rank, got: 0, drew: false, card: null, books: [] } }, again: false };
}

export function play(table, move, side) {
  const found = /^a(\d{1,2})$/.exec(move);
  if (move !== "d" && !(found && Number(found[1]) < RANKS)) return { error: "bad" };
  const hand = table.hands[side];
  if (move === "d" ? hand.length > 0 || !table.pond.length : !hand.some((one) => rankOf(one) === Number(found[1]))) return { error: "illegal" };
  const { table: moved, again } = move === "d" ? fish(table, side, null) : ask(table, side, Number(found[1]));
  const { table: settled, made } = booked(moved, side);
  return seated({ ...settled, last: { ...settled.last, books: made } }, again ? side : 1 - side);
}
