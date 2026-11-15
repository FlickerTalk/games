import { fromBase64url, toBase64url } from "./sha256.js";
import { SEED_BYTES, commitText, langFor, result, revealText, seedText, wordsOn } from "./rules.js";

// the phone sees only this share of the grid's words, so a person can beat it
export const SHARE = 0.15;

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
const freshSeed = (random) => Uint8Array.from({ length: SEED_BYTES }, () => Math.floor(random() * 256));

function shuffle(state, memory, random, lang) {
  if (state.commit === null) {
    const seed = freshSeed(random);
    memory.seed = toBase64url(seed);
    return commitText(langFor(lang), seed);
  }
  if (state.seedB === null) return seedText(freshSeed(random));
  return revealText(fromBase64url(memory.seed));
}

// the same words for the whole match, also after the game is opened again
function sees(word, taste) {
  let hash = (2166136261 ^ taste) >>> 0;
  for (const letter of word) hash = Math.imul(hash ^ letter.codePointAt(0), 16777619) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909) >>> 0;
  return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32 < SHARE;
}

export const robot = {
  move(state, side, memory, random, { lang } = {}) {
    if (result(state)) return null;
    memory.taste ??= Math.floor(random() * 2 ** 24);
    if (state.phase === "shuffle") return shuffle(state, memory, random, lang);
    const said = new Set([...state.said[0], ...state.said[1]]);
    const open = wordsOn(state.grid, state.lang).filter((word) => !said.has(word) && sees(word, memory.taste));
    return open.length ? `w${pick(open, random)}` : "x";
  },
};
