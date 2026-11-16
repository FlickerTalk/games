import { describe, expect, it } from "vitest";
import { endsOf, fewestHits, isPrime, splitsCleanly, standingMost, usefulFor } from "../src/numbers.js";

describe("the arithmetic of a split", () => {
  it("knows the primes", () => {
    expect([1, 2, 3, 4, 9, 11, 13, 15, 47].map(isPrime)).toEqual([false, true, true, false, false, true, true, false, true]);
  });

  it("lists the divisors of a hand that divide a number, the capped one left out", () => {
    expect(usefulFor(30, [2, 5, 10])).toEqual([2, 5, 10]);
    expect(usefulFor(30, [2, 5, 10], 5)).toEqual([2, 10]);
    expect(usefulFor(9, [2, 5, 10])).toEqual([]);
  });

  it("finds where a number can end up when it is split for as long as a divisor fits", () => {
    expect([...endsOf(30, [2, 5, 10])]).toEqual([3]);
    expect([...endsOf(20, [2, 5, 10])]).toEqual([1]);
    expect([...endsOf(12, [4, 6])].sort()).toEqual([2, 3]);
    expect([...endsOf(10, [2, 5, 10], 5)].sort()).toEqual([1, 5]);
  });

  it("counts the fewest hits a number needs and the most small golems that ever stand at once", () => {
    expect(fewestHits(30, [2, 5, 10])).toBe(1);
    expect(fewestHits(16, [2, 5, 10])).toBe(4);
    expect(fewestHits(9, [2, 5, 10])).toBe(0);
    expect(standingMost(20, [2, 5, 10])).toBe(10);
    expect(standingMost(30, [2, 5, 10])).toBe(10);
    expect(standingMost(8, [2])).toBe(4);
    expect(standingMost(50, [2, 5, 10])).toBe(25);
  });

  it("accepts a number only when every way of splitting it ends on the same prime or on ones, with or without the cap", () => {
    expect(splitsCleanly(30, [2, 5, 10])).toBe(true);
    expect(splitsCleanly(18, [2, 5, 10])).toBe(false);
    expect(splitsCleanly(7, [2, 5, 10])).toBe(false);
    expect(splitsCleanly(12, [4, 6])).toBe(false);
    expect(splitsCleanly(30, [2, 5, 10], 10)).toBe(true);
    expect(splitsCleanly(30, [2, 5, 10], 5)).toBe(false);
    expect(splitsCleanly(20, [2, 5, 10], 5)).toBe(false);
  });
});
