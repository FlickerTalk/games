import { describe, expect, it } from "vitest";
import { EMPTY_BONUS, linePoints, pointsFor } from "../src/scoring.js";

describe("the score", () => {
  it("gives a point for each tile laid", () => {
    expect(pointsFor({ tiles: 4, lines: 0, emptied: false })).toBe(4);
  });

  it("gives more for lines that leave together than for the same lines one by one", () => {
    expect([0, 1, 2, 3, 4].map(linePoints)).toEqual([0, 10, 30, 60, 100]);
    expect(linePoints(2)).toBeGreaterThan(2 * linePoints(1));
    expect(pointsFor({ tiles: 1, lines: 2, emptied: false })).toBe(31);
  });

  it("adds a bonus when the lines leave the whole court empty", () => {
    expect(EMPTY_BONUS).toBe(50);
    expect(pointsFor({ tiles: 2, lines: 1, emptied: true })).toBe(62);
  });
});
