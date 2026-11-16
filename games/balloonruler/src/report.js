import { SEED_LENGTH, isSeed } from "../../../kit/src/canvas/random.js";
import { MOST_SHOTS, STAGES, STEPS, numbersOf } from "./numbers.js";
import { scoreOf } from "./scoring.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const HEAD = SEED_LENGTH + 1;

export const MOST_LENGTH = HEAD + 2 * MOST_SHOTS;

function letters(guess) {
  const step = Math.round(guess * STEPS);
  return LETTERS[step >> 6] + LETTERS[step & 63];
}

export const encodeReport = (seed, stage, guesses) => seed + LETTERS[stage] + guesses.map(letters).join("");

export function readReport(move) {
  if (typeof move !== "string" || move.length < HEAD || move.length > MOST_LENGTH || (move.length - HEAD) % 2) return null;
  const seed = move.slice(0, SEED_LENGTH);
  const stage = LETTERS.indexOf(move[SEED_LENGTH]);
  if (!isSeed(seed) || !STAGES[stage]) return null;
  const guesses = [];
  for (let at = HEAD; at < move.length; at += 2) {
    const [high, low] = [LETTERS.indexOf(move[at]), LETTERS.indexOf(move[at + 1])];
    if (high < 0 || low < 0) return null;
    guesses.push((high * 64 + low) / STEPS);
  }
  return { seed, stage, guesses, score: scoreOf(numbersOf(seed, stage), guesses) };
}
