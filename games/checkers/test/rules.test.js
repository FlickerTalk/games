// The rules of checkers as the kit asks for them: twelve men each on the dark squares, dark (side
// 0) starts and moves down the board; a man steps forward, a king anywhere; captures jump and are
// compulsory, and go on with the same piece; a man crowned stops; a stuck side loses; fifty king
// moves without a capture are a draw. A move is the squares it touches, joined by "-".
import { describe, expect, it } from "vitest";
import { QUIET_LIMIT, count, initial, isDark, legalMoves, play, result, squaresOf, turn } from "../src/rules.js";

/** A board from eight rows of `.`, `d`, `l` (men) and `D`, `L` (kings), the side to move given. */
function board(rows, next, quiet = 0) {
  const marks = { d: 0, l: 1, D: 2, L: 3 };
  const cells = rows.join("").split("").map((mark) => (mark in marks ? marks[mark] : null));
  return { cells, next, quiet };
}

function after(...moves) {
  let state = initial();
  for (const move of moves) {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

describe("checkers", () => {
  it("starts with twelve men each on the dark squares, dark to move, with seven openings", () => {
    const state = initial();
    expect(count(state.cells)).toEqual([12, 12]);
    expect(state.cells.every((piece, cell) => piece === null || isDark(cell))).toBe(true);
    expect(state.cells[1]).toBe(0);
    expect(state.cells[62]).toBe(1);
    expect(turn(state)).toBe(0);
    expect(legalMoves(state, 0)).toEqual(["17-24", "17-26", "19-26", "19-28", "21-28", "21-30", "23-30"]);
  });

  it("moves a man one square forward only, and refuses anything else", () => {
    const state = after("21-30");
    expect(state.cells[30]).toBe(0);
    expect(state.cells[21]).toBeNull();
    expect(turn(state)).toBe(1);
    expect(play(initial(), "21-14", 0)).toEqual({ error: "illegal" }); // backwards
    expect(play(initial(), "21-29", 0)).toEqual({ error: "illegal" }); // straight
    expect(play(initial(), "40-33", 0)).toEqual({ error: "illegal" }); // not its piece
    expect(play(initial(), "21-30", 1)).toEqual({ error: "turn" });
    expect(play(initial(), "x", 0)).toEqual({ error: "bad" });
    expect(play(initial(), 21, 0)).toEqual({ error: "bad" });
    expect(play(initial(), "21-99", 0)).toEqual({ error: "bad" });
    expect(squaresOf("17-35-53")).toEqual([17, 35, 53]);
  });

  it("makes a capture compulsory, jumping over the enemy to the empty square beyond", () => {
    const state = board(["........", "........", ".....d..", "....l...", "........", "........", "........", "........"], 0);
    expect(legalMoves(state, 0)).toEqual(["21-35"]);
    const played = play(state, "21-35", 0).state;
    expect(played.cells[28]).toBeNull();
    expect(played.cells[35]).toBe(0);
    expect(count(played.cells)).toEqual([1, 0]);
    expect(play(state, "21-30", 0)).toEqual({ error: "illegal" });
  });

  it("goes on jumping with the same piece, and takes any capture, not only the longest", () => {
    const state = board(["........", "........", ".....d..", "....l...", "........", "..l.....", "........", "........"], 0);
    expect(legalMoves(state, 0)).toEqual(["21-35-49"]);
    const played = play(state, "21-35-49", 0).state;
    expect(count(played.cells)).toEqual([1, 0]);
    expect(played.cells[49]).toBe(0);
    // Two captures on offer: either may be taken.
    const choice = board(["........", "........", "...d....", "..l.l...", "........", "........", "........", "........"], 0);
    expect(legalMoves(choice, 0).sort()).toEqual(["19-33", "19-37"]);
  });

  it("crowns a man on the far row, ends its move there, and lets a king move and capture backwards", () => {
    const state = board(["........", "........", "........", "........", "........", "........", "...d....", "........"], 0);
    const played = play(state, "51-58", 0).state;
    expect(played.cells[58]).toBe(2);
    const crowning = board(["........", "........", "........", "........", "........", "..d.....", "...l....", "........"], 0);
    // The man jumps to the far row and is crowned: it stops, though it could jump on were it a king.
    expect(legalMoves(crowning, 0)).toEqual(["42-60"]);
    const king = board(["........", "........", "........", "....D...", "...l....", "........", "........", "........"], 0);
    expect(legalMoves(king, 0)).toEqual(["28-42"]);
    const free = board(["........", "........", "........", "....D...", "........", "........", "........", "........"], 0);
    expect(legalMoves(free, 0).sort()).toEqual(["28-19", "28-21", "28-35", "28-37"]);
  });

  it("is lost by the side with no move, with or without pieces left", () => {
    const none = board(["........", "........", "........", "........", "........", "........", "........", "l......."], 0);
    expect(result(none)).toEqual({ winner: 1, dark: 0, light: 1, how: "captured" });
    const stuck = board(["........", "........", "........", "........", "........", "........", ".d......", "l.l....."], 0);
    // Dark's man at 49 is boxed in: both squares ahead are taken, and a jump would leave the board.
    expect(legalMoves(stuck, 0)).toEqual([]);
    expect(result(stuck)).toEqual({ winner: 1, dark: 1, light: 2, how: "stuck" });
    expect(play(stuck, "49-56", 0)).toEqual({ error: "over" });
    expect(result(initial())).toBeNull();
  });

  it("counts quiet king moves towards a draw, and forgets them on a capture or a man's move", () => {
    const state = board(["........", "........", "........", "....D...", "........", "........", ".....L..", "........"], 0, QUIET_LIMIT - 1);
    expect(result(state)).toBeNull();
    const moved = play(state, "28-19", 0).state;
    expect(moved.quiet).toBe(QUIET_LIMIT);
    expect(result(moved)).toEqual({ winner: null, dark: 1, light: 1, how: "quiet" });
    const withMan = board(["........", "........", "........", "....D...", "........", "..d.....", ".....L..", "........"], 0, 10);
    expect(play(withMan, "42-49", 0).state.quiet).toBe(0);
    expect(play(withMan, "28-19", 0).state.quiet).toBe(11);
  });

  it("never changes the state it is given", () => {
    const state = initial();
    const copy = structuredClone(state);
    play(state, "21-30", 0);
    legalMoves(state, 0);
    expect(state).toEqual(copy);
  });
});
