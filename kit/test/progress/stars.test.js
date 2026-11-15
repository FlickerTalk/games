import { describe, expect, it } from "vitest";
import { checkStars, starsFor } from "../../src/progress/stars.js";

describe("the stars of a round", () => {
  const stars = checkStars({ two: 20, three: 35 });

  it("are one for any round that ends, two from the score the game declares for two, three from the score for three", () => {
    expect([-5, 0, 19.9, 20, 34, 35, 1000].map((score) => starsFor(score, stars))).toEqual([1, 1, 1, 2, 2, 3, 3]);
  });

  it("are never fewer than one, even without a score", () => {
    for (const score of [Number.NaN, undefined, null, "35", -Infinity]) expect(starsFor(score, stars), String(score)).toBe(1);
  });

  it("are checked when the game is defined: two numbers, three stars asking for a higher score than two", () => {
    for (const broken of [null, [], { two: 20 }, { three: 35 }, { two: "20", three: 35 }, { two: 20, three: Infinity }]) {
      expect(() => checkStars(broken), JSON.stringify(broken)).toThrow("two and three");
    }
    for (const broken of [{ two: 35, three: 20 }, { two: 20, three: 20 }]) {
      expect(() => checkStars(broken), JSON.stringify(broken)).toThrow("higher score");
    }
    expect(checkStars({ two: 1, three: 2 })).toEqual({ two: 1, three: 2 });
    expect(Object.isFrozen(stars)).toBe(true);
  });
});
