import { describe, expect, it } from "vitest";
import { BOX_GAP_MS, BURST_MS, POP_MS, STROKE_MS, cuesBetween, drawers, durationOf, extraTurn, moveFrame, planMove } from "../src/moves.js";
import { LINES, initial, play } from "../src/rules.js";

const after = (state, line) => play(state, line, state.next).state;
const through = (lines) => lines.reduce(after, initial());
const TWO = through([0, 20, 21, 8, 25, 26]);

describe("who drew each line", () => {
  it("follows the turns of the round, a side drawing again after closing a box", () => {
    const by = drawers([0, 4, 20, 21, 1]);
    expect(by).toHaveLength(LINES);
    expect([by[0], by[4], by[20], by[21], by[1]]).toEqual([0, 1, 0, 1, 1]);
    expect(by[2]).toBeNull();
  });

  it("skips what the rules refuse", () => {
    const by = drawers([0, 0, "x", 4]);
    expect([by[0], by[4]]).toEqual([0, 1]);
  });
});

describe("how a dots and boxes move is shown", () => {
  it("draws a line that closes nothing", () => {
    expect(planMove(initial(), after(initial(), 5), 5)).toEqual({ line: 5, side: 0, closed: [] });
  });

  it("claims every box a line closes, two at once when it closes two", () => {
    expect(planMove(TWO, after(TWO, 4), 4)).toEqual({ line: 4, side: 0, closed: [0, 4] });
  });

  it("shows nothing moving when the new position does not follow from the old one by that line", () => {
    const moved = after(initial(), 5);
    expect(planMove(initial(), moved, 6)).toBeNull();
    expect(planMove(moved, initial(), 5)).toBeNull();
    expect(planMove(initial(), moved, null)).toBeNull();
    expect(planMove(null, moved, 5)).toBeNull();
  });

  it("draws the line, then pops each box it closes in turn with a short burst", () => {
    const plan = planMove(TWO, after(TWO, 4), 4);
    const drawing = moveFrame(plan, STROKE_MS / 2);
    expect(drawing.stroke).toBeCloseTo(0.5, 6);
    expect(drawing.pops.map((one) => one.progress)).toEqual([0, 0]);
    expect(drawing.bursts).toEqual([]);
    const first = moveFrame(plan, STROKE_MS + POP_MS / 2);
    expect(first.stroke).toBe(1);
    expect(first.pops[0].progress).toBeGreaterThan(first.pops[1].progress);
    expect(first.bursts.map((one) => one.box)).toEqual([0, 4]);
    expect(moveFrame(plan, durationOf(plan) - 1).done).toBe(false);
    expect(moveFrame(plan, durationOf(plan))).toMatchObject({ stroke: 1, bursts: [], done: true });
    expect(durationOf(plan)).toBe(STROKE_MS + BOX_GAP_MS + Math.max(POP_MS, BURST_MS));
    expect(durationOf(planMove(initial(), after(initial(), 5), 5))).toBe(STROKE_MS);
  });

  it("names a sound for each box as it pops", () => {
    const plan = planMove(TWO, after(TWO, 4), 4);
    expect(cuesBetween(plan, -1, STROKE_MS - 1)).toEqual([]);
    expect(cuesBetween(plan, -1, STROKE_MS)).toEqual(["claim"]);
    expect(cuesBetween(plan, STROKE_MS, STROKE_MS + BOX_GAP_MS)).toEqual(["claim"]);
    expect(cuesBetween(planMove(initial(), after(initial(), 5), 5), -1, 1000)).toEqual([]);
  });

  it("knows the boxes whose closing gave their side another turn, and none once the round is over", () => {
    const closed = through([0, 4, 20, 21]);
    expect(extraTurn(closed, 21)).toEqual([0]);
    expect(extraTurn(through([0, 4]), 4)).toEqual([]);
    expect(extraTurn(initial(), null)).toEqual([]);
    let state = initial();
    let last = null;
    for (let line = 0; line < LINES; line += 1) {
      state = after(state, line);
      last = line;
    }
    expect(extraTurn(state, last)).toEqual([]);
  });
});
