import { describe, expect, it } from "vitest";
import { nextCells, tap, touching, wordOf } from "../src/picking.js";

const GRID = [..."catsoxeetnrfdlmp"];

describe("tracing a word on the grid", () => {
  it("lets any tile start a word, then only the free tiles touching the last one, and nothing off turn", () => {
    expect(nextCells([], true)).toHaveLength(16);
    expect(nextCells([0], true)).toEqual([1, 4, 5]);
    expect(nextCells([0, 5], true)).toEqual([1, 2, 4, 6, 8, 9, 10]);
    expect(nextCells([], false)).toEqual([]);
    expect(nextCells([0], false)).toEqual([]);
  });

  it("knows which tiles touch, across the diagonals too, and never across the edge", () => {
    expect(touching(0, 5)).toBe(true);
    expect(touching(3, 4)).toBe(false);
    expect(touching(5, 5)).toBe(false);
    expect(touching(15, 10)).toBe(true);
  });

  it("adds a tile to the end, and cuts the word back to before a tile tapped again", () => {
    expect(tap([], 0)).toEqual([0]);
    expect(tap([0, 1], 2)).toEqual([0, 1, 2]);
    expect(tap([0, 1, 2], 1)).toEqual([0]);
    expect(tap([0, 1, 2], 0)).toEqual([]);
  });

  it("reads the word along the tiles", () => {
    expect(wordOf(GRID, [0, 1, 2])).toBe("cat");
    expect(wordOf(GRID, [])).toBe("");
  });
});
