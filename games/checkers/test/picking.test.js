import { describe, expect, it } from "vitest";
import { choices, dropOn, dropSquares, tap } from "../src/picking.js";
import { initial } from "../src/rules.js";

function fromRows(rows, next) {
  const marks = { d: 0, l: 1, D: 2, L: 3 };
  return { cells: rows.join("").split("").map((mark) => (mark in marks ? marks[mark] : null)), next, quiet: 0 };
}

const CAPTURE = fromRows(["........", "........", ".....d..", "....l...", "........", "..l.....", "........", "........"], 0);

describe("picking a move on the checkers board", () => {
  it("offers the pieces that may move, then where the chosen one may go", () => {
    const start = choices(initial(), 0, true, []);
    expect(start.from).toEqual([17, 19, 21, 23]);
    expect(start.to).toEqual([]);
    expect(start.forced).toEqual([]);
    expect(choices(initial(), 0, true, [21]).to).toEqual([28, 30]);
  });

  it("offers nothing out of turn or before the coin", () => {
    expect(choices(initial(), 0, false, [])).toMatchObject({ legal: [], from: [], to: [] });
    expect(choices(initial(), null, true, []).from).toEqual([]);
  });

  it("marks the pieces that must capture while a capture is compulsory", () => {
    const seen = choices(CAPTURE, 0, true, []);
    expect(seen.from).toEqual([21]);
    expect(seen.forced).toEqual([21]);
    expect(choices(CAPTURE, 0, true, [21]).forced).toEqual([]);
  });

  it("plays a step with two taps, and drops a choice tapped again", () => {
    const legal = choices(initial(), 0, true, []).legal;
    expect(tap(legal, [], 21)).toEqual({ path: [21], move: null });
    expect(tap(legal, [21], 30)).toEqual({ path: [], move: "21-30" });
    expect(tap(legal, [21], 21)).toEqual({ path: [], move: null });
    expect(tap(legal, [], 1)).toEqual({ path: [], move: null });
    expect(tap(legal, [21], 37)).toEqual({ path: [21], move: null });
  });

  it("chains the jumps of a capture before playing it", () => {
    const legal = choices(CAPTURE, 0, true, []).legal;
    expect(tap(legal, [21], 35)).toEqual({ path: [21, 35], move: null });
    expect(choices(CAPTURE, 0, true, [21, 35]).to).toEqual([49]);
    expect(tap(legal, [21, 35], 49)).toEqual({ path: [], move: "21-35-49" });
  });

  it("lets a dragged piece land where a step or a whole capture ends, or stop halfway", () => {
    const steps = choices(initial(), 0, true, []).legal;
    expect([...dropSquares(steps, [21])].sort((a, b) => a - b)).toEqual([28, 30]);
    expect(dropOn(steps, [21], 30)).toEqual({ path: [], move: "21-30" });
    const jumps = choices(CAPTURE, 0, true, []).legal;
    expect([...dropSquares(jumps, [21])].sort((a, b) => a - b)).toEqual([35, 49]);
    expect(dropOn(jumps, [21], 49)).toEqual({ path: [], move: "21-35-49" });
    expect(dropOn(jumps, [21], 35)).toEqual({ path: [21, 35], move: null });
  });
});
