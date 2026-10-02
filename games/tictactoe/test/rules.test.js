// The rules of Tic-Tac-Toe as the kit asks for them: side 0 (✖, who starts the round) and side 1
// (⭕) take turns on a 3×3 board; three in a row, a column or a diagonal wins; a full board with
// no line is a draw. A move is a cell, 0 to 8, row by row.
import { describe, expect, it } from "vitest";
import { LINES, initial, play, result, turn } from "../src/rules.js";

/** Plays the cells in order, the sides taking turns from side 0. */
function after(...cells) {
  let state = initial();
  for (const cell of cells) {
    const played = play(state, cell, turn(state));
    if (played.error) throw new Error(`${cell}: ${played.error}`);
    state = played.state;
  }
  return state;
}

describe("Tic-Tac-Toe", () => {
  it("starts empty, with side 0 to move, and the sides take turns", () => {
    expect(initial().cells).toEqual(Array(9).fill(null));
    expect(turn(initial())).toBe(0);
    expect(turn(after(4))).toBe(1);
    expect(turn(after(4, 0))).toBe(0);
    expect(after(4, 0).cells).toEqual([1, null, null, null, 0, null, null, null, null]);
  });

  it("is won with three in a row, in a column or on a diagonal", () => {
    expect(LINES).toHaveLength(8);
    expect(result(after(0, 3, 1, 4, 2))).toEqual({ winner: 0, line: [0, 1, 2] });
    expect(result(after(0, 1, 3, 2, 6))).toEqual({ winner: 0, line: [0, 3, 6] });
    expect(result(after(0, 1, 4, 2, 8))).toEqual({ winner: 0, line: [0, 4, 8] });
    expect(result(after(1, 2, 0, 4, 3, 6))).toEqual({ winner: 1, line: [2, 4, 6] });
    expect(result(after(0, 4, 8))).toBeNull();
  });

  it("is a draw when the board is full and nobody has a line", () => {
    // ✖ ⭕ ✖ / ✖ ⭕ ⭕ / ⭕ ✖ ✖
    const full = after(0, 1, 2, 4, 3, 5, 7, 6, 8);
    expect(full.cells.every((cell) => cell !== null)).toBe(true);
    expect(result(full)).toEqual({ winner: null, line: null });
  });

  it("refuses a taken cell, the wrong side, a move after the end, and what is not a cell", () => {
    expect(play(after(4), 4, 1)).toEqual({ error: "taken" });
    expect(play(after(4), 0, 0)).toEqual({ error: "turn" });
    expect(play(after(0, 3, 1, 4, 2), 5, 1)).toEqual({ error: "over" });
    for (const bad of [-1, 9, 1.5, "4", null, undefined, Number.NaN]) expect(play(initial(), bad, 0), String(bad)).toEqual({ error: "bad" });
  });

  it("never changes the state it is given", () => {
    const state = after(4);
    const before = structuredClone(state);
    play(state, 0, 1);
    expect(state).toEqual(before);
  });
});
