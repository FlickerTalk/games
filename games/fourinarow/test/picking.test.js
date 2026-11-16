import { describe, expect, it } from "vitest";
import { openColumns, pick } from "../src/picking.js";
import { initial, play, turn } from "../src/rules.js";

const dropped = (columns) => columns.reduce((state, column) => play(state, column, turn(state)).state, initial());
const FULL_FIRST = dropped([0, 0, 0, 0, 0, 0]);

describe("picking a move on the Four in a Row board", () => {
  it("offers every column with room on the user's turn", () => {
    expect(openColumns(initial().cells, true)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(openColumns(FULL_FIRST.cells, true)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("offers nothing out of turn", () => {
    expect(openColumns(initial().cells, false)).toEqual([]);
  });

  it("plays a column with one tap, and nothing for a full column or out of turn", () => {
    expect(pick(initial().cells, true, 3)).toBe(3);
    expect(pick(FULL_FIRST.cells, true, 0)).toBeNull();
    expect(pick(initial().cells, false, 3)).toBeNull();
    expect(pick(initial().cells, true, 7)).toBeNull();
  });
});
