import { describe, expect, it } from "vitest";
import { SEED_LENGTH, isSeed, randomOf, seedOf } from "../src/random.js";

describe("the game's randomness", () => {
  it("turns any text into a seed of eight letters a move can carry", () => {
    expect(SEED_LENGTH).toBe(8);
    const seed = seedOf("abc/0");
    expect(seed).toMatch(/^[A-Za-z0-9_-]{8}$/);
    expect(seedOf("abc/0")).toBe(seed);
    expect(seedOf("abc/1")).not.toBe(seed);
    expect(isSeed(seed)).toBe(true);
    for (const wrong of ["", "abc", "abcdefg!", "abcdefghi", 12345678, null]) expect(isSeed(wrong), String(wrong)).toBe(false);
  });

  it("draws the same numbers from the same seed, in [0, 1), and others from another", () => {
    const one = randomOf("AAAAAAAA");
    const two = randomOf("AAAAAAAA");
    const other = randomOf("AAAAAAAB");
    const first = Array.from({ length: 50 }, one);
    expect(Array.from({ length: 50 }, two)).toEqual(first);
    expect(Array.from({ length: 50 }, other)).not.toEqual(first);
    for (const value of first) expect(value >= 0 && value < 1).toBe(true);
  });

  it("spreads its numbers evenly enough for dealing", () => {
    const next = randomOf(seedOf("spread"));
    const buckets = Array(10).fill(0);
    for (let at = 0; at < 10_000; at += 1) buckets[Math.floor(next() * 10)] += 1;
    for (const count of buckets) expect(Math.abs(count - 1000)).toBeLessThan(150);
  });
});
