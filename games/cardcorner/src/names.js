import { rankOf, suitOf } from "./card.js";

const SUIT_KEYS = ["spades", "hearts", "diamonds", "clubs"];
const RANK_KEYS = { 0: "ace", 10: "jack", 11: "queen", 12: "king" };

export const suitName = (suit, t) => t(SUIT_KEYS[suit]);
export const rankName = (rank, t) => (RANK_KEYS[rank] ? t(RANK_KEYS[rank]) : String(rank + 1));
export const cardName = (one, t) => t("cardOf", { rank: rankName(rankOf(one), t), suit: suitName(suitOf(one), t) });
export const cardNames = (cards, t) => cards.map((one) => cardName(one, t)).join(", ");
