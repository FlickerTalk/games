import { describe, expect, it } from "vitest";
import { openPits, pick } from "../src/picking.js";
import { initial } from "../src/rules.js";

const position = (pits, next = 0) => ({ pits, next });
const NEARLY_OVER = position([0, 0, 0, 0, 0, 0, 20, 1, 2, 3, 0, 0, 0, 22], 0);

describe("picking a pit on the mancala board", () => {
  it("offers the side's own pits that hold seeds, counted from its left", () => {
    expect(openPits(initial(), 0, true)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(openPits(position([0, 3, 0, 0, 1, 0, 0, 4, 4, 4, 4, 4, 4, 0], 0), 0, true)).toEqual([1, 4]);
    expect(openPits(position([4, 4, 4, 4, 4, 4, 0, 0, 0, 2, 0, 0, 5, 0], 1), 1, true)).toEqual([2, 5]);
  });

  it("offers nothing out of turn, before the coin, or once the round is over", () => {
    expect(openPits(initial(), 0, false)).toEqual([]);
    expect(openPits(initial(), null, true)).toEqual([]);
    expect(openPits(NEARLY_OVER, 0, true)).toEqual([]);
  });

  it("plays a pit with one tap, and never an empty one", () => {
    const state = position([0, 3, 0, 0, 1, 0, 0, 4, 4, 4, 4, 4, 4, 0], 0);
    expect(pick(state, 0, true, 4)).toBe(4);
    expect(pick(state, 0, true, 0)).toBeNull();
    expect(pick(state, 0, false, 4)).toBeNull();
  });
});
