import { describe, expect, it } from "vitest";
import { FLICK_PACE, flickScript, replayScript } from "../src/flick.js";
import { candidatesFor, replayTries } from "../src/puzzle.js";
import { makeTrain, wagonOf } from "../src/train.js";

const [A, B] = [wagonOf(0), wagonOf(1)];
const TRAIN = makeTrain([A, B, A, B, A, B], [1, 4]);
const seeds = Array.from({ length: 40 }, (_, at) => `seed-${at}`);

describe("Flick completing a train", () => {
  it("always finishes it, with wagons from the siding only", () => {
    for (const seed of seeds) {
      const offered = candidatesFor(TRAIN, seed, 4);
      const script = flickScript(TRAIN, offered, seed);
      expect(script.every((step) => offered.includes(step.wagon))).toBe(true);
      expect(replayTries(TRAIN, script.map((step) => step.wagon)), seed).not.toBeNull();
    }
  });

  it("sometimes tries a wagon that does not fit, once at most, and sometimes gets it right at once", () => {
    const wrongs = seeds.map((seed) => replayTries(TRAIN, flickScript(TRAIN, candidatesFor(TRAIN, seed, 4), seed).map((step) => step.wagon)).wrongs);
    expect(Math.max(...wrongs)).toBe(1);
    expect(Math.min(...wrongs)).toBe(0);
  });

  it("does the same thing for the same seed, at a pace one can follow", () => {
    const offered = candidatesFor(TRAIN, "seed", 4);
    expect(flickScript(TRAIN, offered, "seed")).toEqual(flickScript(TRAIN, offered, "seed"));
    expect(FLICK_PACE).toBeGreaterThanOrEqual(900);
  });
});

describe("a friend's solution", () => {
  it("is replayed wagon by wagon as it was tried", () => {
    expect(replayScript([B, A, A])).toEqual([{ wagon: B }, { wagon: A }, { wagon: A }]);
  });
});
