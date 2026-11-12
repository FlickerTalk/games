import { describe, expect, it } from "vitest";
import { SIZE, count, flips, initial, moves, play, result, turn } from "../src/rules.js";

function after(...cells) {
  let state = initial();
  for (const cell of cells) {
    const played = play(state, cell, turn(state));
    if (played.error) throw new Error(`${cell}: ${played.error}`);
    state = played.state;
  }
  return state;
}

function board(rows, next) {
  const cells = rows.join("").split("").map((mark) => (mark === "d" ? 0 : mark === "l" ? 1 : null));
  return { cells, next };
}

describe("Reversi", () => {
  it("starts with four discs in the middle, dark to move, on an 8 × 8 board", () => {
    expect(SIZE).toBe(8);
    const state = initial();
    expect(state.cells.filter((cell) => cell !== null)).toHaveLength(4);
    expect([state.cells[27], state.cells[28], state.cells[35], state.cells[36]]).toEqual([1, 0, 0, 1]);
    expect(turn(state)).toBe(0);
    expect(moves(state.cells, 0).sort((a, b) => a - b)).toEqual([19, 26, 37, 44]);
    expect(count(state.cells)).toEqual([2, 2]);
  });

  it("turns the discs a move brackets, in every direction, and gives the turn to the other side", () => {
    const state = after(19);
    expect(state.cells[19]).toBe(0);
    expect(state.cells[27]).toBe(0);
    expect(count(state.cells)).toEqual([4, 1]);
    expect(turn(state)).toBe(1);
    const next = after(19, 18);
    expect(count(next.cells)).toEqual([3, 3]);
    const diagonal = board(["........", "........", "........", "...dl...", "...ld...", ".....l..", "........", "........"], 1);
    expect(flips(diagonal.cells, 18, 1)).toEqual([27, 36]);
    expect(flips(diagonal.cells, 20, 1)).toEqual([]);
  });

  it("refuses a cell that is taken, off the board, out of turn or that turns nothing", () => {
    expect(play(initial(), 27, 0)).toEqual({ error: "illegal" });
    expect(play(initial(), 0, 0)).toEqual({ error: "illegal" });
    expect(play(initial(), 64, 0)).toEqual({ error: "bad" });
    expect(play(initial(), -1, 0)).toEqual({ error: "bad" });
    expect(play(initial(), "19", 0)).toEqual({ error: "bad" });
    expect(play(initial(), 19, 1)).toEqual({ error: "turn" });
  });

  it("lets a side play again when the other has no move", () => {
    const state = board(["........", "........", "........", "...dl...", "...dd...", "........", "........", "........"], 0);
    expect(moves(state.cells, 1).length).toBeGreaterThan(0);
    const played = play(state, 29, 0).state;
    expect(count(played.cells)).toEqual([5, 0]);
    expect(result(played)).toEqual({ winner: 0, dark: 5, light: 0 });
  });

  it("passes the turn back when the other side cannot move but the game goes on", () => {
    const state = board(["dddddddd", "dddddddd", "dddddddd", "dddddddd", "dddddddd", "dddddddd", "dddddd..", "ddddddl."], 0);
    expect(moves(state.cells, 0)).toEqual([63]);
    const played = play(state, 63, 0).state;
    expect(count(played.cells)).toEqual([62, 0]);
    expect(result(played)).toEqual({ winner: 0, dark: 62, light: 0 });
  });

  it("keeps the turn with the same side when only it can move", () => {
    const open = board(["........", "........", "........", ".d..d...", "l.......", ".d...l..", "........", "........"], 1);
    const played = play(open, 18, 1).state;
    expect(count(played.cells)).toEqual([2, 4]);
    expect(moves(played.cells, 0)).toEqual([]);
    expect(moves(played.cells, 1)).toEqual([50]);
    expect(turn(played)).toBe(1);
    expect(result(played)).toBeNull();
    const stuck = board(["l.......", "dl......", "........", "........", "........", "........", "........", "........"], 1);
    const again = play(stuck, 16, 1).state;
    expect(count(again.cells)).toEqual([0, 4]);
    expect(result(again)).toEqual({ winner: 1, dark: 0, light: 4 });
  });

  it("is a draw with as many discs each when nobody can move", () => {
    const state = board(["dddddddd", "dddddddd", "dddddddd", "dddddddd", "llllllll", "llllllll", "llllllll", "llllllll"], 0);
    expect(result(state)).toEqual({ winner: null, dark: 32, light: 32 });
    expect(play(state, 0, 0)).toEqual({ error: "over" });
  });

  it("never changes the state it is given", () => {
    const state = initial();
    const copy = structuredClone(state);
    play(state, 19, 0);
    expect(state).toEqual(copy);
  });
});
