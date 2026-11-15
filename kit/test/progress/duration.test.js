import { describe, expect, it } from "vitest";
import { HALFWAY_FROM_SECONDS, LONGEST_ROUND_SECONDS, hasHalfway, roundSeconds } from "../../src/progress/duration.js";

describe("the length of a round", () => {
  it("grows within each block of four levels and starts lower at the next block, over the first twelve levels", () => {
    const opening = Array.from({ length: 12 }, (_, at) => roundSeconds(at + 1, 0));
    expect(opening).toEqual([35, 40, 45, 55, 45, 50, 60, 70, 55, 65, 75, 90]);
  });

  it("repeats 60, 70, 80 and 90 seconds for ever from level 13", () => {
    for (let level = 13; level <= 400; level += 1) {
      expect(roundSeconds(level, 0), `level ${level}`).toBe([60, 70, 80, 90][(level - 13) % 4]);
    }
  });

  it("never lasts more than 90 seconds, whatever the level and the losses", () => {
    expect(LONGEST_ROUND_SECONDS).toBe(90);
    for (let level = 1; level <= 300; level += 1) {
      for (const losses of [0, 1, 2, 3, 7]) expect(roundSeconds(level, losses)).toBeLessThanOrEqual(90);
    }
  });

  it("keeps its own length after a single loss", () => {
    for (let level = 1; level <= 40; level += 1) expect(roundSeconds(level, 1)).toBe(roundSeconds(level, 0));
  });

  it("takes the length of the level before after two losses in a row, but never more than the level's own", () => {
    expect([4, 8, 12, 16].map((level) => roundSeconds(level, 2))).toEqual([45, 60, 75, 80]);
    expect([5, 9, 13].map((level) => roundSeconds(level, 2))).toEqual([45, 55, 60]);
    expect(roundSeconds(1, 2)).toBe(35);
    for (let level = 1; level <= 100; level += 1) {
      expect(roundSeconds(level, 2), `level ${level}`).toBeLessThanOrEqual(roundSeconds(level, 0));
    }
  });

  it("reads a level that is not a whole number from one up as the whole level below it, at least one, and odd losses as none", () => {
    expect([0, -3, Number.NaN, Infinity, undefined, "7"].map((level) => roundSeconds(level, 0))).toEqual([35, 35, 35, 35, 35, 35]);
    expect(roundSeconds(4.9, 0)).toBe(55);
    expect(roundSeconds(4)).toBe(55);
    for (const losses of [Number.NaN, -1, "2", null]) expect(roundSeconds(4, losses), String(losses)).toBe(55);
  });

  it("shows a halfway marker from 60 seconds on", () => {
    expect(HALFWAY_FROM_SECONDS).toBe(60);
    expect([35, 55, 59.9, 60, 75, 90].map(hasHalfway)).toEqual([false, false, false, true, true, true]);
  });
});
