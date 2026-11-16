import { bySuit, pointsOf } from "./card.js";
import { fits, meldKind } from "./melds.js";

export const HAND = 7;
export const TURNS = 100;

export function deal(deck) {
  const hands = [[], []];
  for (let at = 0; at < HAND * 2; at += 1) hands[at % 2 === 0 ? 1 : 0].push(deck[at]);
  return { table: { hands, stock: deck.slice(HAND * 2 + 1).reverse(), discard: [deck[HAND * 2]], melds: [], step: "draw", took: null, turns: 0 }, next: 1 };
}

const total = (hand) => hand.reduce((sum, one) => sum + pointsOf(one), 0);
const without = (hand, gone) => hand.filter((one) => !gone.includes(one));
const withHand = (table, side, hand) => table.hands.map((one, who) => (who === side ? hand : one));

function out(table, side) {
  return { table, next: side, end: { winner: side, reason: "out", points: table.hands.map(total) } };
}

function draw(table, move, side) {
  const from = move === "ds" ? "stock" : "discard";
  if (!table[from].length) return { error: "illegal" };
  const rest = table[from].slice(0, -1);
  const taken = table[from].at(-1);
  return { table: { ...table, [from]: rest, hands: withHand(table, side, [...table.hands[side], taken]), step: "play", took: from === "discard" ? taken : null }, next: side };
}

function meld(table, cards, side) {
  const hand = table.hands[side];
  if (!cards.every((one) => hand.includes(one)) || !meldKind(cards)) return { error: "illegal" };
  const next = { ...table, hands: withHand(table, side, without(hand, cards)), melds: [...table.melds, [...cards].sort(bySuit)] };
  return next.hands[side].length ? { table: next, next: side } : out(next, side);
}

function add(table, one, at, side) {
  const hand = table.hands[side];
  if (!hand.includes(one) || !table.melds[at] || !fits(table.melds[at], one)) return { error: "illegal" };
  const melds = table.melds.map((cards, index) => (index === at ? [...cards, one].sort(bySuit) : cards));
  const next = { ...table, hands: withHand(table, side, without(hand, [one])), melds };
  return next.hands[side].length ? { table: next, next: side } : out(next, side);
}

function discard(table, one, side) {
  const hand = table.hands[side];
  if (!hand.includes(one) || (one === table.took && hand.length > 1)) return { error: "illegal" };
  const next = { ...table, hands: withHand(table, side, without(hand, [one])), discard: [...table.discard, one], step: "draw", took: null, turns: table.turns + 1 };
  if (!next.hands[side].length) return out(next, side);
  if (next.stock.length && next.turns < TURNS) return { table: next, next: 1 - side };
  const [a, b] = next.hands.map(total);
  return { table: next, next: 1 - side, end: { winner: a === b ? null : a < b ? 0 : 1, reason: "stock", points: [a, b] } };
}

export function play(table, move, side) {
  if (move === "ds" || move === "dd") return table.step === "draw" ? draw(table, move, side) : { error: "illegal" };
  const melded = /^m(\d{1,2}(?:\.\d{1,2}){2,12})$/.exec(move);
  const added = /^a(\d{1,2})\.(\d{1,2})$/.exec(move);
  const dropped = /^x(\d{1,2})$/.exec(move);
  if (!melded && !added && !dropped) return { error: "bad" };
  if (table.step !== "play") return { error: "illegal" };
  if (melded) return meld(table, melded[1].split(".").map(Number), side);
  if (added) return add(table, Number(added[1]), Number(added[2]), side);
  return discard(table, Number(dropped[1]), side);
}
