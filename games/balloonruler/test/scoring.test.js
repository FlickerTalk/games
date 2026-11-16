import { describe, expect, it } from "vitest";
import { GOOD, GREAT, REACH, hitsReal, isFar, pointsOf, scoreOf, starsOf } from "../src/scoring.js";

describe("the score of a shot", () => {
  it("gives three stars to a close guess, two to a fair one and one to any other: a guess always counts", () => {
    expect(starsOf(0)).toBe(3);
    expect(starsOf(GREAT)).toBe(3);
    expect(starsOf(GREAT + 0.001)).toBe(2);
    expect(starsOf(GOOD)).toBe(2);
    expect(starsOf(GOOD + 0.001)).toBe(1);
    expect(starsOf(1)).toBe(1);
    expect(isFar(GOOD)).toBe(false);
    expect(isFar(GOOD + 0.01)).toBe(true);
  });

  it("makes a small balloon worth more than a large one when the arrow reaches it", () => {
    expect(hitsReal(REACH)).toBe(true);
    expect(hitsReal(REACH + 0.001)).toBe(false);
    expect(pointsOf(0.01, 0)).toBe(5);
    expect(pointsOf(0.01, 1)).toBe(4);
    expect(pointsOf(0.01, 2)).toBe(3);
    expect(pointsOf(0.045, 0)).toBe(4);
    expect(pointsOf(0.08, 0)).toBe(2);
    expect(pointsOf(0.6, 0)).toBe(1);
  });

  it("adds a round up, guess by guess", () => {
    const numbers = [{ share: 0.5, size: 0 }, { share: 0.2, size: 2 }, { share: 0.9, size: 1 }];
    expect(scoreOf(numbers, [0.5, 0.3, 0.1])).toBe(5 + 2 + 1);
    expect(scoreOf(numbers, [])).toBe(0);
    expect(scoreOf(numbers, [0.5, 0.2, 0.9, 0.4])).toBe(5 + 3 + 4);
  });
});
