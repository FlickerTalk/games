// The rules of Crazy Eights, as the kit asks for them (README, "A game"). Two players, a deck of
// 52; seven cards each, one turned over, the rest a stock. In turn, a side plays a card of the
// suit or the rank on the table, or an eight, which takes any suit it names; or it draws one card
// from the stock, and the turn passes; with the stock gone, it passes. The side that plays its
// last card wins; two passes in a row with the stock gone end the round, fewer cards winning.
//
// The deck is shuffled by both phones together: side 0 commits to a secret, side 1 answers with
// its own, side 0 reveals, and the order of the deck follows from both (so neither chose it). The
// rules run synchronously on both phones, so the hash is the game's own SHA-256. Each phone sees
// the whole deck: the hands are hidden by the board, not by cryptography, as between friends.
//
// Moves (strings): c<hash> (the commitment, base64url), s<seed> (24 bytes, base64url), r<seed>
// (the reveal), p<card>[s|h|d|c] (a card, 0–51, with the suit an eight names), d (draw), x (pass).

import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";

export const CARDS = 52;
export const HAND = 7;
export const SEED_BYTES = 24;
export const SUITS = ["s", "h", "d", "c"];
const DOMAIN = "ftgames-deck-v1";
const ZERO = new Uint8Array([0]);

/** The suit of a card, 0–3 (spades, hearts, diamonds, clubs). */
export const suitOf = (card) => Math.floor(card / 13);
/** The rank of a card, 0–12 (ace, two … ten, jack, queen, king). */
export const rankOf = (card) => card % 13;
/** Whether the card is an eight, the wild card. */
export const isEight = (card) => rankOf(card) === 7;

/** The commitment to a shuffle seed. */
export function commitText(seed) {
  return `c${toBase64url(sha256(utf8(DOMAIN), ZERO, seed))}`;
}

const seedLength = Math.ceil((SEED_BYTES * 4) / 3);

/** 24 bytes from a move's text after its first character; null when it is not that. */
function seedOf(text) {
  const bytes = fromBase64url(text.slice(1));
  return text.length === 1 + seedLength && bytes && bytes.length === SEED_BYTES ? bytes : null;
}

/** The deck in the order both seeds give: a Fisher–Yates shuffle fed by SHA-256, each index drawn
 *  without bias (a byte too big for the range is skipped; more bytes from SHA-256(first ‖ k)). */
export function shuffled(seedA, seedB) {
  const first = sha256(utf8(`${DOMAIN}/out`), ZERO, seedA, seedB);
  let block = first;
  let at = 0;
  let counter = 0;
  const next = () => {
    if (at === block.length) {
      counter += 1;
      const k = new Uint8Array(4);
      new DataView(k.buffer).setUint32(0, counter);
      block = sha256(first, k);
      at = 0;
    }
    return block[at++];
  };
  const deck = Array.from({ length: CARDS }, (_, card) => card);
  for (let i = CARDS - 1; i > 0; i -= 1) {
    const range = i + 1;
    const limit = 256 - (256 % range);
    let byte = next();
    while (byte >= limit) byte = next();
    const j = byte % range;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function initial() {
  return { phase: "shuffle", commit: null, seedB: null, next: 0, hands: [[], []], stock: [], pile: [], suit: null, passes: 0, end: null };
}

/** The side to move. */
export function turn(state) {
  return state.next;
}

/** Whether `card` may go on the table now. */
export function playable(state, card) {
  if (isEight(card)) return true;
  const top = state.pile.at(-1);
  return suitOf(card) === state.suit || (top !== undefined && rankOf(card) === rankOf(top));
}

/** The cards of `side`'s hand it may play now. */
export function playableCards(state, side) {
  return state.phase === "play" ? state.hands[side].filter((card) => playable(state, card)) : [];
}

export function result(state) {
  return state.end;
}

/** The round dealt from a shuffled deck: side 1 (the non-dealer) gets the first card and plays first. */
function dealt(state, deck) {
  const hands = [[], []];
  for (let at = 0; at < HAND * 2; at += 1) hands[at % 2 === 0 ? 1 : 0].push(deck[at]);
  const top = deck[HAND * 2];
  return { ...state, phase: "play", hands, pile: [top], stock: deck.slice(HAND * 2 + 1), suit: suitOf(top), next: 1, passes: 0 };
}

export function play(state, move, side) {
  if (typeof move !== "string" || move.length === 0 || move.length > 64) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };

  if (state.phase === "shuffle") {
    if (state.commit === null) {
      if (!/^c[A-Za-z0-9_-]{43}$/.test(move)) return { error: "bad" };
      return { state: { ...state, commit: move.slice(1), next: 1 } };
    }
    if (state.seedB === null) {
      const seed = move[0] === "s" ? seedOf(move) : null;
      if (!seed) return { error: "bad" };
      return { state: { ...state, seedB: move.slice(1), next: 0 } };
    }
    const seed = move[0] === "r" ? seedOf(move) : null;
    if (!seed) return { error: "bad" };
    if (commitText(seed) !== `c${state.commit}`) {
      // The dealer did not reveal what it committed to: the round is the other side's.
      return { state: { ...state, phase: "done", end: { winner: 1, reason: "cheat" } } };
    }
    return { state: dealt(state, shuffled(seed, fromBase64url(state.seedB))) };
  }

  const other = 1 - side;
  const hands = state.hands.map((hand) => [...hand]);
  if (move === "d") {
    if (!state.stock.length) return { error: "illegal" };
    const stock = [...state.stock];
    hands[side].push(stock.pop());
    return { state: { ...state, hands, stock, next: other, passes: 0 } };
  }
  if (move === "x") {
    if (state.stock.length) return { error: "illegal" };
    const passes = state.passes + 1;
    const next = { ...state, next: other, passes };
    if (passes >= 2) {
      const [a, b] = hands.map((hand) => hand.length);
      next.phase = "done";
      next.end = { winner: a === b ? null : a < b ? 0 : 1, reason: "stuck", cards: [a, b] };
    }
    return { state: next };
  }
  const match = /^p(\d{1,2})([shdc])?$/.exec(move);
  if (!match) return { error: "bad" };
  const card = Number(match[1]);
  if (card >= CARDS) return { error: "bad" };
  if (!hands[side].includes(card)) return { error: "illegal" };
  if (!playable(state, card)) return { error: "illegal" };
  if (isEight(card) !== Boolean(match[2])) return { error: "illegal" };
  hands[side] = hands[side].filter((one) => one !== card);
  const next = { ...state, hands, pile: [...state.pile, card], suit: match[2] ? SUITS.indexOf(match[2]) : suitOf(card), next: other, passes: 0 };
  if (!hands[side].length) {
    next.phase = "done";
    next.end = { winner: side, reason: "out" };
  }
  return { state: next };
}

/** The reveal move of a seed. */
export const revealText = (seed) => `r${toBase64url(seed)}`;
/** The seed move of side 1. */
export const seedText = (seed) => `s${toBase64url(seed)}`;
