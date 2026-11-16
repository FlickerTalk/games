import { describe, expect, it } from "vitest";
import { flickFor, flickGuess } from "../src/flick.js";
import { numbersOf } from "../src/numbers.js";
import { scoreOf } from "../src/scoring.js";

const SEED = "Ruler001";
const numbers = numbersOf(SEED, 4);
const guesses = (error, count = 40, seed = SEED) => {
  const flick = flickFor({ seed, numbers, error });
  return Array.from({ length: count }, (_, index) => flickGuess(flick, index));
};

describe("Flick's guesses", () => {
  it("are the same every time for the same round, whatever the order they are asked in", () => {
    const flick = flickFor({ seed: SEED, numbers, error: 0.3 });
    const late = flickGuess(flick, 7);
    expect(flickGuess(flick, 2)).toBe(guesses(0.3)[2]);
    expect(late).toBe(guesses(0.3)[7]);
    expect(guesses(0.3, 10, "Ruler002")).not.toEqual(guesses(0.3, 10));
  });

  it("land on the ruler, near the true place but rarely on it: believable, and beatable", () => {
    const made = guesses(0.3);
    const errors = made.map((guess, at) => Math.abs(guess - numbers[at].share));
    for (const guess of made) {
      expect(guess).toBeGreaterThanOrEqual(0);
      expect(guess).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...errors)).toBeLessThanOrEqual(0.3 + 1e-9);
    const mean = errors.reduce((sum, one) => sum + one, 0) / errors.length;
    expect(mean).toBeGreaterThan(0.03);
    expect(mean).toBeLessThan(0.16);
    const perfect = scoreOf(numbers, numbers.slice(0, 40).map((one) => one.share));
    expect(scoreOf(numbers, made)).toBeLessThan(perfect * 0.75);
    expect(scoreOf(numbers, made)).toBeGreaterThan(40);
  });

  it("get closer as the levels grow", () => {
    const mean = (error) => guesses(error).reduce((sum, guess, at) => sum + Math.abs(guess - numbers[at].share), 0) / 40;
    expect(mean(0.14)).toBeLessThan(mean(0.3));
  });
});
