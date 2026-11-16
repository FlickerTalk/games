import { describe, expect, it } from "vitest";
import { CHEER_MS, ENTER_MS, LINE_MS, POP_MS, durationOf, moveFrame, planMove } from "../src/moves.js";
import { initial, play, turn } from "../src/rules.js";

const after = (state, move) => play(state, move, turn(state)).state;
const playing = (moves) => moves.reduce(after, initial());
const FOUR = [112, 113, 97, 114, 96, 130, 98, 145, 95, 160];

describe("how a Five in a Row move is shown", () => {
  it("grows the stone onto its crossing with a pop, then rests", () => {
    const plan = planMove(initial(), after(initial(), 112), 112);
    expect(plan).toEqual({ cell: 112, side: 0, line: null });
    expect(moveFrame(plan, 0)).toMatchObject({ enter: 0, pop: 0, line: null, cheer: 0, done: false });
    expect(moveFrame(plan, ENTER_MS / 2).enter).toBeCloseTo(0.5, 6);
    expect(moveFrame(plan, ENTER_MS).enter).toBe(1);
    expect(moveFrame(plan, POP_MS)).toMatchObject({ pop: null, done: true });
    expect(durationOf(plan)).toBe(Math.max(ENTER_MS, POP_MS));
  });

  it("joins the five once the last stone has landed, and lets the five cheer a while before resting", () => {
    const before = playing(FOUR);
    const plan = planMove(before, after(before, 99), 99);
    expect(plan).toEqual({ cell: 99, side: 0, line: [95, 96, 97, 98, 99] });
    expect(moveFrame(plan, ENTER_MS - 1).line).toBe(0);
    expect(moveFrame(plan, ENTER_MS + LINE_MS / 2).line).toBeCloseTo(0.5, 6);
    expect(moveFrame(plan, ENTER_MS + LINE_MS / 2).cheer).toBe(1);
    expect(moveFrame(plan, ENTER_MS + LINE_MS + CHEER_MS - 1).cheer).toBeLessThan(0.1);
    expect(moveFrame(plan, ENTER_MS + LINE_MS + CHEER_MS)).toMatchObject({ line: 1, cheer: 0, done: true });
  });

  it("shows nothing moving when the new position does not follow from the old one by that move", () => {
    const moved = after(initial(), 112);
    expect(planMove(initial(), moved, 113)).toBeNull();
    expect(planMove(moved, initial(), 112)).toBeNull();
    expect(planMove(initial(), moved, null)).toBeNull();
    expect(planMove(null, moved, 112)).toBeNull();
    expect(planMove(initial(), after(moved, 113), 113)).toBeNull();
  });
});
