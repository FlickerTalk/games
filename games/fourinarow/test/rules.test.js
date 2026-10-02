// The rules of Four in a Row as the kit asks for them: side 0 (who starts the round) and side 1
// take turns dropping a disc into one of 7 columns of a 6-row board; it falls to the lowest free
// cell. Four in a row, a column or a diagonal wins; a full board without four is a draw. A move is
// a column, 0 to 6. Cells are numbered row by row from the top: the bottom row is 35 to 41.
import { describe, expect, it } from "vitest";
import { COLUMNS, ROWS, initial, play, result, turn } from "../src/rules.js";

/** Drops discs into the columns in order, the sides taking turns from side 0. */
function after(...columns) {
  let state = initial();
  for (const column of columns) {
    const played = play(state, column, turn(state));
    if (played.error) throw new Error(`${column}: ${played.error}`);
    state = played.state;
  }
  return state;
}

/**
 * A full board where nobody has four (rows from the top, 0 and 1 the sides), and an order of
 * columns that fills it with the sides taking turns:
 *   0100100 / 0100100 / 0100100 / 1011011 / 1101011 / 1101011
 */
const DRAW = [0, 1, 0, 1, 0, 0, 2, 0, 2, 0, 2, 1, 1, 1, 3, 1, 3, 2, 2, 4, 2, 4, 3, 3, 5, 3, 5, 3, 5, 4, 4, 5, 6, 5, 6, 5, 6, 6, 4, 6, 4, 6];

describe("Four in a Row", () => {
  it("starts empty on 7 columns by 6 rows, with side 0 to move, and the sides take turns", () => {
    expect([COLUMNS, ROWS]).toEqual([7, 6]);
    expect(initial().cells).toEqual(Array(42).fill(null));
    expect(turn(initial())).toBe(0);
    expect(turn(after(3))).toBe(1);
    expect(turn(after(3, 3))).toBe(0);
  });

  it("drops each disc to the lowest free cell of its column", () => {
    const state = after(3, 3, 0);
    expect(state.cells[38]).toBe(0);
    expect(state.cells[31]).toBe(1);
    expect(state.cells[35]).toBe(0);
    expect(state.cells.filter((cell) => cell !== null)).toHaveLength(3);
  });

  it("is won with four in a row, and says which cells", () => {
    expect(result(after(0, 0, 1, 1, 2, 2, 3))).toEqual({ winner: 0, line: [35, 36, 37, 38] });
    expect(result(after(0, 0, 1, 1, 2, 2))).toBeNull();
  });

  it("is won with four in a column, by either side", () => {
    expect(result(after(0, 1, 0, 1, 0, 1, 0))).toEqual({ winner: 0, line: [14, 21, 28, 35] });
    expect(result(after(0, 1, 0, 1, 0, 1, 6, 1))).toEqual({ winner: 1, line: [15, 22, 29, 36] });
  });

  it("is won with four on a diagonal, rising or falling", () => {
    expect(result(after(0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3))).toEqual({ winner: 0, line: [17, 23, 29, 35] });
    expect(result(after(6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3))).toEqual({ winner: 0, line: [17, 25, 33, 41] });
  });

  it("reports every cell of a run longer than four", () => {
    expect(result(after(0, 0, 1, 1, 2, 2, 4, 4, 3))).toEqual({ winner: 0, line: [35, 36, 37, 38, 39] });
  });

  it("is a draw when the board is full and nobody has four", () => {
    const full = after(...DRAW);
    expect(full.cells.every((cell) => cell !== null)).toBe(true);
    expect(result(full)).toEqual({ winner: null, line: null });
    expect(result(after(...DRAW.slice(0, -1)))).toBeNull();
  });

  it("refuses a full column, what is not a column, the wrong side and a move after the end", () => {
    expect(play(after(0, 0, 0, 0, 0, 0), 0, 0)).toEqual({ error: "full" });
    for (const bad of [-1, 7, 1.5, "3", null, undefined, Number.NaN]) expect(play(initial(), bad, 0), String(bad)).toEqual({ error: "bad" });
    expect(play(after(3), 3, 0)).toEqual({ error: "turn" });
    expect(play(after(3), 4, 1).state).toBeDefined();
    expect(play(after(0, 0, 1, 1, 2, 2, 3), 5, 1)).toEqual({ error: "over" });
  });

  it("never changes the state it is given", () => {
    const state = after(3);
    const before = structuredClone(state);
    play(state, 3, 1);
    expect(state).toEqual(before);
  });
});
