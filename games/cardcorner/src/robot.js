import { fromBase64url, toBase64url } from "../../../kit/src/cards/sha256.js";
import { SEED_BYTES, commitText, revealText, seedText } from "../../../kit/src/cards/shuffle.js";
import { pointsOf, rankOf, sameKind, suitOf } from "./card.js";
import { fits, findMelds } from "./melds.js";
import { SIZES } from "./pairs.js";
import { HAND_OVER, chooseText, result } from "./rules.js";

const REMEMBERS = 0.65;
const TAKES_DISCARD = 0.9;
const RECALLS_ASK = 0.8;
const ASKS_MOST = 0.7;

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

function choose(state, side, random) {
  if (side === 0 && !state.handed) return HAND_OVER;
  const game = pick(["pairs", "war", "rummy", "fish"], random);
  return chooseText(game, game === "pairs" ? pick(SIZES, random) : null);
}

function recalled(state, memory, random) {
  if (memory.pairs?.round !== state.commit) memory.pairs = { round: state.commit, looked: [], known: [] };
  const mind = memory.pairs;
  for (const at of state.table.seen) {
    if (mind.looked.includes(at)) continue;
    mind.looked.push(at);
    if (random() < REMEMBERS) mind.known.push(at);
  }
  return mind.known;
}

function pairsMove({ table }, known, random) {
  const { cards, owner } = table;
  const up = table.miss ? [] : table.up;
  const free = cards.map((_, at) => at).filter((at) => owner[at] === null && !up.includes(at));
  const sure = known.filter((at) => free.includes(at));
  const fresh = free.filter((at) => !sure.includes(at));
  if (up.length === 1) {
    const partner = sure.find((at) => sameKind(cards[at], cards[up[0]]));
    return `f${partner ?? pick(fresh.length ? fresh : free, random)}`;
  }
  const paired = sure.find((at) => sure.some((other) => other !== at && sameKind(cards[at], cards[other])));
  return `f${paired ?? pick(fresh.length ? fresh : free, random)}`;
}

function useOf(one, hand) {
  let use = 0;
  for (const other of hand) {
    if (other === one) continue;
    if (rankOf(other) === rankOf(one)) use += 2;
    else if (suitOf(other) === suitOf(one) && Math.abs(rankOf(other) - rankOf(one)) <= 2) use += 3 - Math.abs(rankOf(other) - rankOf(one));
  }
  return use;
}

function rummyMove({ table }, side, random) {
  const hand = table.hands[side];
  if (table.step === "draw") {
    const top = table.discard.at(-1);
    const wanted = top !== undefined && (findMelds([...hand, top]).some((meld) => meld.includes(top)) || table.melds.some((meld) => fits(meld, top)));
    return (wanted && random() < TAKES_DISCARD) || !table.stock.length ? "dd" : "ds";
  }
  const [meld] = findMelds(hand);
  if (meld) return `m${meld.join(".")}`;
  for (const one of hand) {
    const at = table.melds.findIndex((cards) => fits(cards, one));
    if (at >= 0) return `a${one}.${at}`;
  }
  const loose = hand.length > 1 ? hand.filter((one) => one !== table.took) : hand;
  const least = Math.min(...loose.map((one) => useOf(one, hand)));
  const spare = loose.filter((one) => useOf(one, hand) === least);
  const most = Math.max(...spare.map(pointsOf));
  return `x${pick(spare.filter((one) => pointsOf(one) === most), random)}`;
}

function fishMove({ table, commit }, side, memory, random) {
  const hand = table.hands[side];
  if (!hand.length) return "d";
  if (memory.fish?.round !== commit) memory.fish = { round: commit, heard: [] };
  const { heard } = memory.fish;
  const { last } = table;
  if (last && last.by !== side && last.rank !== null && !heard.includes(last.rank)) heard.push(last.rank);
  const held = [...new Set(hand.map(rankOf))];
  const told = heard.filter((rank) => held.includes(rank));
  if (told.length && random() < RECALLS_ASK) {
    heard.splice(heard.indexOf(told[0]), 1);
    return `a${told[0]}`;
  }
  const count = (rank) => hand.filter((one) => rankOf(one) === rank).length;
  const most = Math.max(...held.map(count));
  return `a${pick(random() < ASKS_MOST ? held.filter((rank) => count(rank) === most) : held, random)}`;
}

export const robot = {
  unseen: (state) => state.phase === "choose" || state.phase === "shuffle",
  move(state, side, memory, random) {
    if (result(state)) return null;
    if (state.phase === "choose") return choose(state, side, random);
    if (state.phase === "shuffle") return shuffle(state, memory, random);
    if (state.game === "pairs") return pairsMove(state, recalled(state, memory, random), random);
    if (state.game === "rummy") return rummyMove(state, side, random);
    if (state.game === "fish") return fishMove(state, side, memory, random);
    return "f";
  },
};
