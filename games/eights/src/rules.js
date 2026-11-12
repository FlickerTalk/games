// Two passes in a row with the stock gone end the round, fewer cards winning.
// Side 0 commits to a seed, side 1 answers with its own, side 0 reveals, and the deck follows from both.
// Each phone sees the whole deck, the hands are hidden by the board and not by cryptography.
// Moves: c<hash> (commitment, base64url), s<seed> (24 bytes, base64url), r<seed> (reveal),
// p<card>[s|h|d|c] (a card 0–51, with the suit an eight names), d (draw), x (pass).

import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";

export const CARDS = 52;
export const HAND = 7;
export const SEED_BYTES = 24;
export const SUITS = ["s", "h", "d", "c"];
const DOMAIN = "ftgames-deck-v1";
const ZERO = new Uint8Array([0]);

// 0–3: spades, hearts, diamonds, clubs
export const suitOf = (card) => Math.floor(card / 13);
// 0 = ace … 12 = king
export const rankOf = (card) => card % 13;
export const isEight = (card) => rankOf(card) === 7;

export function commitText(seed) {
  return `c${toBase64url(sha256(utf8(DOMAIN), ZERO, seed))}`;
}

const seedLength = Math.ceil((SEED_BYTES * 4) / 3);

function seedOf(text) {
  const bytes = fromBase64url(text.slice(1));
  return text.length === 1 + seedLength && bytes && bytes.length === SEED_BYTES ? bytes : null;
}

/** Unbiased Fisher–Yates fed by SHA-256. A byte too big for the range is skipped, more bytes come
 *  from SHA-256(first ‖ k). */
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

export function turn(state) {
  return state.next;
}

export function playable(state, card) {
  if (isEight(card)) return true;
  const top = state.pile.at(-1);
  return suitOf(card) === state.suit || (top !== undefined && rankOf(card) === rankOf(top));
}

export function playableCards(state, side) {
  return state.phase === "play" ? state.hands[side].filter((card) => playable(state, card)) : [];
}

export function result(state) {
  return state.end;
}

/** Side 1, the non-dealer, gets the first card and plays first. */
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

export const revealText = (seed) => `r${toBase64url(seed)}`;
export const seedText = (seed) => `s${toBase64url(seed)}`;
