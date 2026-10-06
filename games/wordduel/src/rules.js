// The rules of Word Duel, as the kit asks for them (README, "A game"). Each side picks a secret
// word of five letters for the other and commits to it with a hash; the sides then guess in turn,
// each move answering the other's last guess (for each letter: in its place, elsewhere in the
// word, or not in it) and guessing once more, six guesses each at most. When a side has guessed
// right, the other still takes its guess of the same number; then both reveal their word and salt,
// and the rules check every answer against them. The side that needed fewer guesses wins; as many
// is a draw; a side whose answers did not match its word loses instead, and if neither was honest
// it is a draw. Pure and synchronous: the hash is the game's own SHA-256.
//
// Moves (strings):
//   c<lang><hash>          side 0's commitment, with the language of the words (en, es)
//   c<hash>                side 1's commitment
//   [answer]>guess         the answer to the other side's last guess, then a guess of five letters
//   answer                 the answer alone, when both have as many guesses and the round is decided
//   r<salt><word>          the reveal: the salt (24 bytes, base64url) and the word
// An answer is five of `g` (in its place), `y` (elsewhere in the word) and `b` (not in the word).

import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";
import * as EN from "./words-en.js";
import * as ES from "./words-es.js";

export const LENGTH = 5;
export const MAX_GUESSES = 6;
export const SALT_BYTES = 24;
export const LANGS = ["en", "es"];
const DOMAIN = "ftgames-word-v1";
const ZERO = new Uint8Array([0]);
const LETTERS = /^[a-zñ]{5}$/;

const LISTS = { en: EN, es: ES };
const cache = new Map();

/** The words of a language: every accepted word (a set) and the common ones (a list). */
export function words(lang) {
  const code = LANGS.includes(lang) ? lang : "en";
  if (!cache.has(code)) {
    const list = LISTS[code];
    cache.set(code, { accepted: new Set(list.ACCEPTED.split(" ")), answers: list.ANSWERS.split(" ") });
  }
  return cache.get(code);
}

/** The language of the words for the app's language: Spanish for Spanish, English for the rest. */
export function langFor(appLang) {
  const base = String(appLang ?? "en").split("-")[0];
  return LANGS.includes(base) ? base : "en";
}

/** Whether `word` may be guessed, or kept secret, in the language. */
export function accepted(lang, word) {
  return LETTERS.test(word) && words(lang).accepted.has(word);
}

/** What a guess tells of the word: for each letter, g (its place), y (elsewhere), b (nowhere). */
export function feedback(guess, word) {
  const marks = Array(LENGTH).fill("b");
  const left = {};
  for (let at = 0; at < LENGTH; at += 1) {
    if (guess[at] === word[at]) marks[at] = "g";
    else left[word[at]] = (left[word[at]] ?? 0) + 1;
  }
  for (let at = 0; at < LENGTH; at += 1) {
    if (marks[at] === "g") continue;
    if (left[guess[at]]) {
      marks[at] = "y";
      left[guess[at]] -= 1;
    }
  }
  return marks.join("");
}

/** The commitment to a secret word with its salt, as base64url. */
export function commitHash(salt, word) {
  return toBase64url(sha256(utf8(DOMAIN), ZERO, salt, utf8(word)));
}

export const commitText = (lang, salt, word) => `c${lang}${commitHash(salt, word)}`;
export const commitTextSecond = (salt, word) => `c${commitHash(salt, word)}`;
export const revealText = (salt, word) => `r${toBase64url(salt)}${word}`;

const saltLength = Math.ceil((SALT_BYTES * 4) / 3);

/** The salt and word of a reveal move; null when it is not one. */
export function parseReveal(text) {
  if (typeof text !== "string" || text[0] !== "r" || text.length !== 1 + saltLength + LENGTH) return null;
  const salt = fromBase64url(text.slice(1, 1 + saltLength));
  const word = text.slice(1 + saltLength);
  if (!salt || salt.length !== SALT_BYTES || !LETTERS.test(word)) return null;
  return { salt, word };
}

export function initial() {
  return { phase: "place", lang: null, commits: [null, null], next: 0, guesses: [[], []], answers: [[], []], reveals: [null, null] };
}

export function turn(state) {
  if (state.phase === "place") return state.commits[0] === null ? 0 : 1;
  return state.next;
}

/** The number of the guess (from 1) with which `side` was told it had the word, or null. */
export function solvedAt(state, side) {
  const at = state.answers[1 - side].indexOf("g".repeat(LENGTH));
  return at < 0 ? null : at + 1;
}

/** The answer `side` owes for the other's last guess, given its real word (the board's helper). */
export function honestAnswer(state, side, word) {
  const guesses = state.guesses[1 - side];
  if (guesses.length <= state.answers[side].length) return "";
  return feedback(guesses.at(-1), word);
}

/** Whether the round is decided once both sides have `count` answered guesses. */
function decided(state, count) {
  return solvedAt(state, 0) !== null || solvedAt(state, 1) !== null || count >= MAX_GUESSES;
}

/** Every answer `side` gave, checked against the word it revealed. */
export function honest(state, side, word) {
  return state.answers[side].every((answer, at) => feedback(state.guesses[1 - side][at], word) === answer);
}

export function result(state) {
  if (state.phase !== "done") return null;
  const fair = state.reveals.map((reveal) => reveal.ok);
  if (!fair[0] && !fair[1]) return { winner: null, reason: "both" };
  if (!fair[0]) return { winner: 1, reason: "cheat" };
  if (!fair[1]) return { winner: 0, reason: "cheat" };
  const [a, b] = [solvedAt(state, 0), solvedAt(state, 1)];
  if (a === null && b === null) return { winner: null, reason: "nobody", guesses: [a, b] };
  if (a !== null && (b === null || a < b)) return { winner: 0, reason: "solved", guesses: [a, b] };
  if (b !== null && (a === null || b < a)) return { winner: 1, reason: "solved", guesses: [a, b] };
  return { winner: null, reason: "tie", guesses: [a, b] };
}

export function play(state, move, side) {
  if (typeof move !== "string" || move.length === 0 || move.length > 64) return { error: "bad" };
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };

  if (state.phase === "place") {
    if (side === 0) {
      const match = /^c(en|es)([A-Za-z0-9_-]{43})$/.exec(move);
      if (!match) return { error: "bad" };
      return { state: { ...state, lang: match[1], commits: [match[2], null] } };
    }
    const match = /^c([A-Za-z0-9_-]{43})$/.exec(move);
    if (!match) return { error: "bad" };
    return { state: { ...state, commits: [state.commits[0], match[1]], phase: "guess", next: 0 } };
  }

  if (state.phase === "guess") {
    const match = /^([gyb]{5})?(?:>([a-zñ]{5}))?$/.exec(move);
    if (!match) return { error: "bad" };
    const [, answer, guess] = match;
    const owes = state.guesses[1 - side].length > state.answers[side].length;
    if (owes !== Boolean(answer)) return { error: "illegal" };
    const next = { ...state, guesses: state.guesses.map((list) => [...list]), answers: state.answers.map((list) => [...list]) };
    if (answer) next.answers[side].push(answer);
    // After side 0 answers, both sides have as many guesses answered: the round may be decided.
    const over = side === 0 && answer && decided(next, next.answers[0].length);
    if (over) {
      if (guess !== undefined) return { error: "illegal" };
      next.phase = "reveal";
      next.next = 0;
      return { state: next };
    }
    if (guess === undefined) return { error: "illegal" };
    if (!accepted(state.lang, guess)) return { error: "illegal" };
    if (state.guesses[side].length >= MAX_GUESSES) return { error: "illegal" };
    next.guesses[side].push(guess);
    next.next = 1 - side;
    return { state: next };
  }

  if (state.phase === "reveal") {
    const reveal = parseReveal(move);
    if (!reveal) return { error: "bad" };
    const ok = commitHash(reveal.salt, reveal.word) === state.commits[side] && accepted(state.lang, reveal.word) && honest(state, side, reveal.word);
    const reveals = [...state.reveals];
    reveals[side] = { ok, word: reveal.word };
    const next = { ...state, reveals, next: 1 - side };
    if (reveals[0] && reveals[1]) next.phase = "done";
    return { state: next };
  }
  return { error: "over" };
}

/** A common word of the language, picked by `random` (0 ≤ x < 1), to suggest as a secret. */
export function suggest(lang, random = Math.random) {
  const { answers } = words(lang);
  return answers[Math.floor(random() * answers.length)];
}
