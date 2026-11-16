import { isEight, playableCards, rankOf, suitOf, turn } from "./rules.js";

export const handOrder = (hand) => [...hand].sort((a, b) => suitOf(a) - suitOf(b) || rankOf(a) - rankOf(b));

export function choices(state, side, canPlay) {
  const open = Boolean(canPlay) && side !== null && side !== undefined && state.phase === "play" && turn(state) === side;
  if (!open) return { open, playable: [], draw: false, pass: false };
  return { open, playable: handOrder(playableCards(state, side)), draw: state.stock.length > 0, pass: state.stock.length === 0 };
}

export function cardMove(card, suit = null) {
  if (!isEight(card)) return `p${card}`;
  return suit ? `p${card}${suit}` : null;
}
