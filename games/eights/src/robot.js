import { fromBase64url, toBase64url } from "./sha256.js";
import { SEED_BYTES, SUITS, commitText, isEight, playable, result, revealText, seedText, suitOf } from "./rules.js";

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
const freshSeed = (random) => Uint8Array.from({ length: SEED_BYTES }, () => Math.floor(random() * 256));

function shuffle(state, memory, random) {
  if (state.commit === null) {
    const seed = freshSeed(random);
    memory.seed = toBase64url(seed);
    return commitText(seed);
  }
  if (state.seedB === null) return seedText(freshSeed(random));
  return revealText(fromBase64url(memory.seed));
}

function held(hand) {
  const count = [0, 0, 0, 0];
  for (const card of hand) if (!isEight(card)) count[suitOf(card)] += 1;
  return count;
}

function mostOf(cards, weigh) {
  const best = Math.max(...cards.map(weigh));
  return cards.filter((card) => weigh(card) === best);
}

export const robot = {
  unseen: (state) => state.phase === "shuffle",
  move(state, side, memory, random) {
    if (result(state)) return null;
    if (state.phase === "shuffle") return shuffle(state, memory, random);
    const hand = state.hands[side];
    const count = held(hand);
    const goes = hand.filter((card) => playable(state, card));
    const plain = goes.filter((card) => !isEight(card));
    if (plain.length) return `p${pick(mostOf(plain, (card) => count[suitOf(card)]), random)}`;
    if (goes.length) {
      const suit = pick(mostOf([0, 1, 2, 3], (one) => count[one]), random);
      return `p${pick(goes, random)}${SUITS[suit]}`;
    }
    return state.stock.length ? "d" : "x";
  },
};
