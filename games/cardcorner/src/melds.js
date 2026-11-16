import { bySuit, rankOf, suitOf } from "./card.js";

export function meldKind(cards) {
  if (cards.length < 3 || new Set(cards).size !== cards.length) return null;
  if (cards.every((one) => rankOf(one) === rankOf(cards[0]))) return cards.length <= 4 ? "set" : null;
  const sorted = [...cards].sort(bySuit);
  const inSequence = sorted.every((one, at) => at === 0 || (suitOf(one) === suitOf(sorted[0]) && rankOf(one) === rankOf(sorted[at - 1]) + 1));
  return inSequence ? "run" : null;
}

export const fits = (meld, one) => meldKind([...meld, one]) !== null;

function runsIn(hand) {
  const sorted = [...hand].sort(bySuit);
  const runs = [];
  let streak = [];
  for (const one of sorted) {
    const last = streak.at(-1);
    if (last !== undefined && suitOf(one) === suitOf(last) && rankOf(one) === rankOf(last) + 1) streak.push(one);
    else {
      if (streak.length >= 3) runs.push(streak);
      streak = [one];
    }
  }
  if (streak.length >= 3) runs.push(streak);
  return runs;
}

export function findMelds(hand) {
  const runs = runsIn(hand);
  const used = new Set(runs.flat());
  const sets = [];
  for (let rank = 0; rank < 13; rank += 1) {
    const same = hand.filter((one) => rankOf(one) === rank && !used.has(one)).sort(bySuit);
    if (same.length >= 3) sets.push(same);
  }
  return [...runs, ...sets];
}
