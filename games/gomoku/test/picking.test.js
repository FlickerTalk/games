import { describe, expect, it } from "vitest";
import { confirm, tap } from "../src/picking.js";
import { CELLS } from "../src/rules.js";

const board = (stones = {}) => Array.from({ length: CELLS }, (_, cell) => stones[cell] ?? null);

describe("picking a crossing on the Five in a Row board", () => {
  it("chooses an empty crossing with a first tap, and places the stone with a second tap on it", () => {
    const cells = board();
    expect(tap(cells, null, 112)).toEqual({ chosen: 112, move: null, miss: false });
    expect(tap(cells, 112, 112)).toEqual({ chosen: null, move: 112, miss: false });
  });

  it("moves the choice to another empty crossing", () => {
    expect(tap(board(), 112, 97)).toEqual({ chosen: 97, move: null, miss: false });
  });

  it("answers a tap on a taken crossing with a miss, and keeps the choice", () => {
    const cells = board({ 112: 0, 113: 1 });
    expect(tap(cells, null, 112)).toEqual({ chosen: null, move: null, miss: true });
    expect(tap(cells, 97, 113)).toEqual({ chosen: 97, move: null, miss: true });
  });

  it("places the chosen stone from the confirming button, and nothing when no crossing is chosen or it was taken meanwhile", () => {
    expect(confirm(board(), 97)).toEqual({ chosen: null, move: 97, miss: false });
    expect(confirm(board(), null)).toEqual({ chosen: null, move: null, miss: false });
    expect(confirm(board({ 97: 1 }), 97)).toEqual({ chosen: null, move: null, miss: false });
  });
});
