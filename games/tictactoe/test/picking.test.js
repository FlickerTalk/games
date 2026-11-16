import { describe, expect, it } from "vitest";
import { openCells, pick } from "../src/picking.js";
import { initial, play, turn } from "../src/rules.js";

function after(...cells) {
  let state = initial();
  for (const cell of cells) state = play(state, cell, turn(state)).state;
  return state;
}

describe("picking a cell on the Tic-Tac-Toe board", () => {
  it("offers every free cell on the user's turn, and none out of turn", () => {
    expect(openCells(initial(), true)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(openCells(after(4, 0), true)).toEqual([1, 2, 3, 5, 6, 7, 8]);
    expect(openCells(after(4, 0), false)).toEqual([]);
  });

  it("plays a free cell, calls a tap on a taken one a miss, and does nothing out of turn", () => {
    const state = after(4, 0);
    expect(pick(state, true, 2)).toEqual({ move: 2 });
    expect(pick(state, true, 4)).toEqual({ miss: 4 });
    expect(pick(state, false, 2)).toBeNull();
    expect(pick(state, true, 9)).toBeNull();
  });
});
