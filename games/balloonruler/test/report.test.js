import { describe, expect, it } from "vitest";
import { MOST_SHOTS, numbersOf } from "../src/numbers.js";
import { MOST_LENGTH, encodeReport, readReport } from "../src/report.js";
import { scoreOf } from "../src/scoring.js";
import { quantise } from "../src/numbers.js";

const SEED = "Ruler001";

describe("a round's report", () => {
  it("carries the seed, the ruler and every guess in a short line of letters, and reads back the same", () => {
    const guesses = [0, 0.25, 0.5, 0.731, 1].map(quantise);
    const move = encodeReport(SEED, 4, guesses);
    expect(move).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(move).toHaveLength(8 + 1 + 2 * guesses.length);
    const read = readReport(move);
    expect(read).toEqual({ seed: SEED, stage: 4, guesses, score: scoreOf(numbersOf(SEED, 4), guesses) });
  });

  it("scores the guesses again from the seed, never trusting a number sent", () => {
    const numbers = numbersOf(SEED, 1);
    const perfect = numbers.slice(0, 6).map((one) => quantise(one.share));
    expect(readReport(encodeReport(SEED, 1, perfect)).score).toBe(scoreOf(numbers, perfect));
    expect(readReport(encodeReport(SEED, 1, [])).score).toBe(0);
  });

  it("refuses anything that is not a report", () => {
    const full = Array.from({ length: MOST_SHOTS }, () => 0.5);
    expect(readReport(encodeReport(SEED, 1, full))).not.toBeNull();
    expect(encodeReport(SEED, 1, full)).toHaveLength(MOST_LENGTH);
    expect(readReport(`${encodeReport(SEED, 1, full)}AA`)).toBeNull();
    expect(readReport(`${encodeReport(SEED, 1, [0.5])}A`)).toBeNull();
    expect(readReport("short")).toBeNull();
    expect(readReport(42)).toBeNull();
    expect(readReport(`${SEED}Z`)).toBeNull();
    expect(readReport(`bad seed${"A"}`)).toBeNull();
    expect(readReport(`${SEED}B*A`)).toBeNull();
  });
});
