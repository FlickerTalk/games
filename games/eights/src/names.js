import { rankOf, suitOf } from "./rules.js";

const SUIT_KEYS = ["spades", "hearts", "diamonds", "clubs"];
const RANK_KEYS = { 0: "ace", 10: "jack", 11: "queen", 12: "king" };

export const suitName = (suit, t) => t(SUIT_KEYS[suit]);

export function cardName(card, t) {
  const rank = rankOf(card);
  return t("cardOf", { rank: RANK_KEYS[rank] ? t(RANK_KEYS[rank]) : String(rank + 1), suit: suitName(suitOf(card), t) });
}
