import { describe, expect, it } from "vitest";
import { FIRST_MS, FLIP_MS, PASS_MS, PLACE_MS, RIPPLE_MS, cuesBetween, durationOf, moveFrame, planMove, turnedBy } from "../src/moves.js";
import { initial, play } from "../src/rules.js";

function board(rows, next) {
  return { cells: rows.join("").split("").map((mark) => (mark === "d" ? 0 : mark === "l" ? 1 : null)), next };
}

const after = (state, move) => play(state, move, state.next).state;
const PASSING = board(["........", "........", "........", "...dl...", "...dd...", "........", "........", "........"], 0);
const DIAGONAL = board(["d.......", ".l......", "..l.....", "...l....", "........", "........", "........", "........"], 0);
const FORCED_PASS = board(["........", "........", "........", ".d..d...", "l.......", ".d...l..", "........", "........"], 1);

describe("how a Reversi move is shown", () => {
  it("places the disc and turns each disc it brackets, counted in steps out from the placed one", () => {
    const plan = planMove(initial(), after(initial(), 19), 19);
    expect(plan).toMatchObject({ cell: 19, side: 0, turned: [{ cell: 27, ring: 1 }], passed: false });
    expect(planMove(DIAGONAL, after(DIAGONAL, 36), 36).turned).toEqual([{ cell: 27, ring: 1 }, { cell: 18, ring: 2 }, { cell: 9, ring: 3 }]);
  });

  it("knows when the other side has no move and must pass, but not when the round is over", () => {
    expect(planMove(FORCED_PASS, after(FORCED_PASS, 18), 18).passed).toBe(true);
    expect(planMove(PASSING, after(PASSING, 29), 29).passed).toBe(false);
  });

  it("shows nothing moving when the new position does not follow from the old one by that move", () => {
    const moved = after(initial(), 19);
    expect(planMove(initial(), moved, 26)).toBeNull();
    expect(planMove(moved, initial(), 19)).toBeNull();
    expect(planMove(initial(), moved, null)).toBeNull();
    expect(planMove(null, moved, 19)).toBeNull();
    expect(planMove(initial(), after(moved, 18), 18)).toBeNull();
  });

  it("pops the disc in, then turns the bracketed discs one step out at a time, never more than three steps a second", () => {
    expect(RIPPLE_MS).toBeGreaterThanOrEqual(1000 / 3);
    const plan = planMove(DIAGONAL, after(DIAGONAL, 36), 36);
    const start = moveFrame(plan, 0);
    expect(start.pop).toBe(0);
    expect(start.flips).toEqual({ 27: 0, 18: 0, 9: 0 });
    expect(moveFrame(plan, PLACE_MS).pop).toBe(1);
    const halfFirst = moveFrame(plan, FIRST_MS + FLIP_MS / 2);
    expect(halfFirst.flips[27]).toBeCloseTo(0.5, 6);
    expect(halfFirst.flips[18]).toBe(0);
    const second = moveFrame(plan, FIRST_MS + RIPPLE_MS + FLIP_MS);
    expect(second.flips).toEqual({ 27: 1, 18: 1, 9: 0 });
    expect(turnedBy(plan)).toBe(durationOf(plan));
    expect(moveFrame(plan, durationOf(plan) - 1).done).toBe(false);
    expect(moveFrame(plan, durationOf(plan))).toMatchObject({ pop: 1, flips: { 27: 1, 18: 1, 9: 1 }, sparks: [], pass: null, done: true });
  });

  it("sparks each disc as it shows its new face", () => {
    const plan = planMove(initial(), after(initial(), 19), 19);
    expect(moveFrame(plan, FIRST_MS).sparks).toEqual([]);
    expect(moveFrame(plan, FIRST_MS + FLIP_MS / 2 + 10).sparks.map((spark) => spark.cell)).toEqual([27]);
  });

  it("shows the side that passes once every disc has turned, for a while", () => {
    const plan = planMove(FORCED_PASS, after(FORCED_PASS, 18), 18);
    const flipped = turnedBy(plan);
    expect(flipped).toBe(durationOf(plan) - PASS_MS);
    expect(moveFrame(plan, flipped - 1).pass).toBeNull();
    expect(moveFrame(plan, flipped + PASS_MS / 2).pass).toMatchObject({ side: 0 });
    expect(moveFrame(plan, flipped + PASS_MS / 2).pass.progress).toBeCloseTo(0.5, 6);
    expect(moveFrame(plan, durationOf(plan)).done).toBe(true);
  });

  it("names the sounds of what starts between two frames: a turn for each step out, and a pass", () => {
    const plan = planMove(DIAGONAL, after(DIAGONAL, 36), 36);
    expect(cuesBetween(plan, -1, FIRST_MS)).toEqual([]);
    expect(cuesBetween(plan, -1, FIRST_MS + FLIP_MS / 2)).toEqual(["flip"]);
    expect(cuesBetween(plan, -1, durationOf(plan))).toEqual(["flip", "flip", "flip"]);
    const passing = planMove(FORCED_PASS, after(FORCED_PASS, 18), 18);
    expect(cuesBetween(passing, -1, durationOf(passing))).toEqual(["flip", "pass"]);
  });
});
