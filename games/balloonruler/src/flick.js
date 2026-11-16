import { localFlick } from "../../../kit/src/canvas/flick.js";
import { quantise } from "./numbers.js";

const EDGE = 0.01;

function guessOf(random, share, error) {
  const bell = (random() + random() + random()) / 1.5 - 1;
  let guess = share + bell * error;
  if (guess < EDGE) guess = Math.min(share + error, 2 * EDGE - guess);
  if (guess > 1 - EDGE) guess = Math.max(share - error, 2 * (1 - EDGE) - guess);
  return quantise(guess);
}

export function flickFor({ seed, numbers, error }) {
  return localFlick({
    seed,
    start: () => ({ guesses: [] }),
    step: (state, random) => ({ guesses: [...state.guesses, guessOf(random, numbers[state.guesses.length].share, error)] }),
    over: (state) => state.guesses.length >= numbers.length,
  });
}

export const flickGuess = (flick, index) => flick.upTo((state) => state.guesses.length > index).state.guesses[index];

export const flickGuesses = (flick, count) => flick.upTo((state) => state.guesses.length >= count).state.guesses.slice(0, count);
