// The rules of Letter Grid, as the kit asks for them (README, "A game"). Sixteen letters in a
// four by four grid, the same for both sides, drawn by both phones together (commit, seed,
// reveal, as the deck of Crazy Eights). In turn, a side says a word it finds on the grid: three
// letters or more, each the neighbour of the one before (sideways or diagonally), no cell twice,
// in the word list of the language, and not said before by either side; or it passes. Three and
// four letters score one point, five two, six three. Two passes in a row end the round; more
// points win, as many is a draw. Pure and synchronous: the hash is the game's own SHA-256.
//
// Moves (strings): c<lang><hash> (side 0's commitment, with the language: en, es), s<seed>,
// r<seed> (24 bytes, base64url), w<word> (a word), x (pass).

import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";
import * as EN from "./words-en.js";
import * as ES from "./words-es.js";

export const SIZE = 4;
export const CELLS = SIZE * SIZE;
export const MIN_LETTERS = 3;
export const SEED_BYTES = 24;
export const LANGS = ["en", "es"];
const DOMAIN = "ftgames-grid-v1";
const ZERO = new Uint8Array([0]);

/** The letters a grid is drawn from, each as often as its weight: the common letters of the
 *  language, no q (its u is seldom beside it on a grid). */
const POOLS = {
  en: { a: 8, b: 2, c: 3, d: 4, e: 12, f: 2, g: 3, h: 3, i: 8, j: 1, k: 1, l: 5, m: 3, n: 6, o: 7, p: 3, r: 7, s: 7, t: 7, u: 3, v: 1, w: 2, x: 1, y: 2, z: 1 },
  es: { a: 12, b: 2, c: 5, d: 5, e: 13, f: 1, g: 2, h: 1, i: 6, j: 1, l: 5, m: 3, n: 7, ñ: 1, o: 9, p: 3, r: 7, s: 8, t: 5, u: 4, v: 1, x: 1, y: 1, z: 1 },
};
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/** The words of the list, read back from their shared-prefix writing. */
export function decode(text) {
  const words = [];
  let prev = "";
  for (const part of text.split(" ")) {
    const word = prev.slice(0, Number(part[0])) + part.slice(1);
    words.push(word);
    prev = word;
  }
  return words;
}

const LISTS = { en: EN, es: ES };
const cache = new Map();

/** The words of a language, as a set, and every beginning of one, for the search of the grid. */
export function words(lang) {
  const code = LANGS.includes(lang) ? lang : "en";
  if (!cache.has(code)) {
    const list = decode(LISTS[code].WORDS);
    const prefixes = new Set();
    for (const word of list) for (let at = 1; at < word.length; at += 1) prefixes.add(word.slice(0, at));
    cache.set(code, { accepted: new Set(list), prefixes });
  }
  return cache.get(code);
}

/** The language of the words for the app's language: Spanish for Spanish, English for the rest. */
export function langFor(appLang) {
  const base = String(appLang ?? "en").split("-")[0];
  return LANGS.includes(base) ? base : "en";
}

export const accepted = (lang, word) => /^[a-zñ]{3,}$/.test(word) && words(lang).accepted.has(word);

/** What a word scores: one point up to four letters, two for five, three for six or more. */
export const points = (word) => (word.length <= 4 ? 1 : word.length === 5 ? 2 : 3);

export function commitText(lang, seed) {
  return `c${lang}${toBase64url(sha256(utf8(DOMAIN), ZERO, seed))}`;
}
export const seedText = (seed) => `s${toBase64url(seed)}`;
export const revealText = (seed) => `r${toBase64url(seed)}`;
const seedLength = Math.ceil((SEED_BYTES * 4) / 3);

function seedOf(text) {
  const bytes = fromBase64url(text.slice(1));
  return text.length === 1 + seedLength && bytes && bytes.length === SEED_BYTES ? bytes : null;
}

/** The sixteen letters both seeds give, with four to nine vowels among them: the bytes of SHA-256
 *  in order (more blocks as needed), each picking a letter from the pool by weight. */
export function gridOf(lang, seedA, seedB) {
  const pool = [];
  for (const [letter, weight] of Object.entries(POOLS[LANGS.includes(lang) ? lang : "en"])) for (let at = 0; at < weight; at += 1) pool.push(letter);
  const limit = 256 - (256 % pool.length);
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
  const letter = () => {
    let byte = next();
    while (byte >= limit) byte = next();
    return pool[byte % pool.length];
  };
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const grid = Array.from({ length: CELLS }, letter);
    const vowels = grid.filter((one) => VOWELS.has(one)).length;
    if (vowels >= 4 && vowels <= 9) return grid;
  }
  return Array.from({ length: CELLS }, letter);
}

const NEIGHBOURS = Array.from({ length: CELLS }, (_, cell) => {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const near = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) near.push(r * SIZE + c);
    }
  }
  return near;
});

/** A path of cells spelling `word` on the grid, each the neighbour of the one before, or null. */
export function pathOf(grid, word) {
  const letters = [...word];
  const walk = (at, cell, used) => {
    if (grid[cell] !== letters[at]) return null;
    const path = [...used, cell];
    if (at === letters.length - 1) return path;
    for (const near of NEIGHBOURS[cell]) {
      if (path.includes(near)) continue;
      const found = walk(at + 1, near, path);
      if (found) return found;
    }
    return null;
  };
  for (let cell = 0; cell < CELLS; cell += 1) {
    const found = walk(0, cell, []);
    if (found) return found;
  }
  return null;
}

/** Every word of the language on the grid (for the tests and the screenshots; a board does not tell). */
export function wordsOn(grid, lang) {
  const { accepted: all, prefixes } = words(lang);
  const found = new Set();
  const walk = (cell, used, text) => {
    const next = text + grid[cell];
    if (next.length >= MIN_LETTERS && all.has(next)) found.add(next);
    if (!prefixes.has(next)) return;
    for (const near of NEIGHBOURS[cell]) if (!used.includes(near)) walk(near, [...used, near], next);
  };
  for (let cell = 0; cell < CELLS; cell += 1) walk(cell, [cell], "");
  return [...found].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export function initial() {
  return { phase: "shuffle", lang: null, commit: null, seedB: null, grid: null, next: 0, said: [[], []], score: [0, 0], passes: 0, end: null };
}

export function turn(state) {
  return state.next;
}

export function result(state) {
  return state.end;
}

/** Why a word cannot be said now: null when it can. */
export function refusal(state, word) {
  if (state.phase !== "play") return "phase";
  if (word.length < MIN_LETTERS) return "short";
  if (!accepted(state.lang, word)) return "unknown";
  if (state.said[0].includes(word) || state.said[1].includes(word)) return "used";
  if (!pathOf(state.grid, word)) return "grid";
  return null;
}

export function play(state, move, side) {
  if (typeof move !== "string" || move.length === 0 || move.length > 64) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };

  if (state.phase === "shuffle") {
    if (state.commit === null) {
      const match = /^c(en|es)([A-Za-z0-9_-]{43})$/.exec(move);
      if (!match) return { error: "bad" };
      return { state: { ...state, lang: match[1], commit: match[2], next: 1 } };
    }
    if (state.seedB === null) {
      if (move[0] !== "s" || !seedOf(move)) return { error: "bad" };
      return { state: { ...state, seedB: move.slice(1), next: 0 } };
    }
    const seed = move[0] === "r" ? seedOf(move) : null;
    if (!seed) return { error: "bad" };
    if (commitText(state.lang, seed) !== `c${state.lang}${state.commit}`) {
      return { state: { ...state, phase: "done", end: { winner: 1, reason: "cheat" } } };
    }
    return { state: { ...state, phase: "play", grid: gridOf(state.lang, seed, fromBase64url(state.seedB)), next: 1 } };
  }

  const other = 1 - side;
  if (move === "x") {
    const passes = state.passes + 1;
    const next = { ...state, passes, next: other };
    if (passes >= 2) {
      const [a, b] = state.score;
      next.phase = "done";
      next.end = { winner: a === b ? null : a > b ? 0 : 1, reason: "passed", score: [a, b] };
    }
    return { state: next };
  }
  const match = /^w([a-zñ]{1,16})$/.exec(move);
  if (!match) return { error: "bad" };
  const word = match[1];
  if (refusal(state, word)) return { error: "illegal" };
  const said = state.said.map((list) => [...list]);
  said[side].push(word);
  const score = [...state.score];
  score[side] += points(word);
  return { state: { ...state, said, score, passes: 0, next: other } };
}
