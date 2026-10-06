// The rules of Five in a Row as the kit asks for them: 15 × 15, black (side 0) starts, a stone on
// any empty intersection; five or more in a row, a column or a diagonal win, a full board is a draw.
import { describe, expect, it } from "vitest";
import { PLAYS } from "../../../preview/shots.js";
import { CELLS, FIVE, SIZE, initial, lineThrough, play, result, turn } from "../src/rules.js";

/** Plays the cells in order, each by the side to move. */
function after(...cells) {
  let state = initial();
  for (const cell of cells) {
    const played = play(state, cell, turn(state));
    if (played.error) throw new Error(`${cell}: ${played.error}`);
    state = played.state;
  }
  return state;
}

const at = (row, col) => row * SIZE + col;

describe("Five in a Row", () => {
  it("starts empty, black to move, on a 15 × 15 board", () => {
    expect(SIZE).toBe(15);
    expect(CELLS).toBe(225);
    expect(FIVE).toBe(5);
    const state = initial();
    expect(state.cells.every((cell) => cell === null)).toBe(true);
    expect(turn(state)).toBe(0);
    expect(result(state)).toBeNull();
  });

  it("places a stone and gives the turn to the other side", () => {
    const state = after(112);
    expect(state.cells[112]).toBe(0);
    expect(turn(state)).toBe(1);
    expect(after(112, 113).cells[113]).toBe(1);
    expect(turn(after(112, 113))).toBe(0);
  });

  it("refuses a cell that is taken, off the board, not a number, or out of turn", () => {
    expect(play(after(112), 112, 1)).toEqual({ error: "illegal" });
    expect(play(initial(), 225, 0)).toEqual({ error: "bad" });
    expect(play(initial(), -1, 0)).toEqual({ error: "bad" });
    expect(play(initial(), 1.5, 0)).toEqual({ error: "bad" });
    expect(play(initial(), "112", 0)).toEqual({ error: "bad" });
    expect(play(initial(), 112, 1)).toEqual({ error: "turn" });
  });

  it("is won by five in a row, in a column, or on either diagonal", () => {
    // Black on row 7, columns 3 to 7; white scattered.
    const row = after(at(7, 3), at(0, 0), at(7, 4), at(0, 1), at(7, 5), at(0, 2), at(7, 6), at(0, 3), at(7, 7));
    expect(result(row)).toEqual({ winner: 0, line: [at(7, 3), at(7, 4), at(7, 5), at(7, 6), at(7, 7)] });
    expect(play(row, at(14, 14), 1)).toEqual({ error: "over" });
    // White wins in a column.
    const column = after(at(0, 0), at(2, 9), at(0, 1), at(3, 9), at(0, 2), at(4, 9), at(0, 3), at(5, 9), at(1, 0), at(6, 9));
    expect(result(column)).toMatchObject({ winner: 1, line: [at(2, 9), at(3, 9), at(4, 9), at(5, 9), at(6, 9)] });
    // Black wins on the falling diagonal, the last stone in the middle of the line.
    const diagonal = after(at(1, 1), at(0, 5), at(2, 2), at(0, 6), at(4, 4), at(0, 7), at(5, 5), at(0, 8), at(3, 3));
    expect(result(diagonal)).toMatchObject({ winner: 0, line: [at(1, 1), at(2, 2), at(3, 3), at(4, 4), at(5, 5)] });
    // And on the rising one.
    const rising = after(at(10, 0), at(0, 5), at(9, 1), at(0, 6), at(8, 2), at(0, 7), at(7, 3), at(0, 8), at(6, 4));
    expect(result(rising)).toMatchObject({ winner: 0 });
  });

  it("counts six or more in a line as a win too, and four as nothing", () => {
    const four = after(at(7, 3), at(0, 0), at(7, 4), at(0, 1), at(7, 5), at(0, 2), at(7, 6));
    expect(result(four)).toBeNull();
    expect(lineThrough(four.cells, at(7, 6), 0)).toBeNull();
    // Black has 3-4-5-6 and 8; the stone at 7 joins them into six.
    const six = after(at(7, 3), at(0, 0), at(7, 4), at(0, 1), at(7, 5), at(0, 2), at(7, 6), at(0, 3), at(7, 8), at(2, 0), at(7, 7));
    expect(result(six).line).toHaveLength(6);
    expect(result(six).winner).toBe(0);
  });

  it("is a draw when the board is full and nobody lined up five", () => {
    // The full board the screenshots play to a draw: 225 stones, black and white in turn.
    const state = after(...PLAYS.gomoku.draw);
    expect(state.count).toBe(CELLS);
    expect(state.cells.every((cell) => cell !== null)).toBe(true);
    expect(result(state)).toEqual({ winner: null });
    expect(play(state, 0, 0)).toEqual({ error: "over" });
  });

  it("never changes the state it is given", () => {
    const state = after(112);
    const copy = structuredClone(state);
    play(state, 113, 1);
    expect(state).toEqual(copy);
  });
});
