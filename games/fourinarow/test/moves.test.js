import { describe, expect, it } from "vitest";
import { BOUNCE_MS, BURST_MS, START_ROW, WIN_MS, cuesBetween, dropFrame, fallMs, planDrop, totalMs, winGlow } from "../src/moves.js";
import { initial, play, turn } from "../src/rules.js";

const dropped = (columns) => columns.reduce((state, column) => play(state, column, turn(state)).state, initial());

describe("how a Four in a Row move is shown", () => {
  it("drops the new disc into the lowest free hole of its column", () => {
    expect(planDrop(initial(), dropped([3]), 3)).toEqual({ column: 3, cell: 38, row: 5, side: 0 });
    expect(planDrop(dropped([3]), dropped([3, 3]), 3)).toEqual({ column: 3, cell: 31, row: 4, side: 1 });
  });

  it("shows nothing falling when the new position does not follow from the old one by that move", () => {
    expect(planDrop(initial(), dropped([3]), 4)).toBeNull();
    expect(planDrop(initial(), dropped([3, 3]), 3)).toBeNull();
    expect(planDrop(dropped([3]), initial(), 3)).toBeNull();
    expect(planDrop(initial(), dropped([3]), null)).toBeNull();
    expect(planDrop(null, dropped([3]), 3)).toBeNull();
  });

  it("lets the disc fall from above the frame, faster and faster, to its hole", () => {
    const plan = planDrop(initial(), dropped([3]), 3);
    const fall = fallMs(plan.row);
    expect(dropFrame(plan, 0)).toMatchObject({ row: START_ROW, landed: false, burst: null, done: false });
    const [quarter, half, three] = [0.25, 0.5, 0.75].map((share) => dropFrame(plan, fall * share).row);
    expect(three - half).toBeGreaterThan(half - quarter);
    expect(dropFrame(plan, fall)).toMatchObject({ row: 5, landed: true });
  });

  it("takes less time to fall into a hole higher up", () => {
    expect(fallMs(0)).toBeLessThan(fallMs(5));
    expect(fallMs(5)).toBeLessThanOrEqual(520);
    expect(fallMs(0)).toBeGreaterThan(120);
  });

  it("bounces once on landing, never below its hole, and bursts round it while it settles", () => {
    const plan = planDrop(initial(), dropped([3]), 3);
    const fall = fallMs(plan.row);
    const rows = Array.from({ length: 20 }, (_, at) => dropFrame(plan, fall + (at * BOUNCE_MS) / 20).row);
    expect(Math.min(...rows)).toBeLessThan(5);
    expect(Math.max(...rows)).toBeLessThanOrEqual(5);
    expect(dropFrame(plan, fall + BURST_MS / 2).burst).toBeCloseTo(0.5, 6);
    expect(dropFrame(plan, fall + BOUNCE_MS / 2).resting).toBe(false);
    expect(dropFrame(plan, fall + BOUNCE_MS)).toMatchObject({ row: 5, resting: true });
    expect(dropFrame(plan, totalMs(plan) - 1).done).toBe(false);
    expect(dropFrame(plan, totalMs(plan))).toMatchObject({ row: 5, burst: null, done: true });
  });

  it("names the sound of the disc landing once, between the two frames it lands between", () => {
    const plan = planDrop(initial(), dropped([3]), 3);
    const fall = fallMs(plan.row);
    expect(cuesBetween(plan, -1, fall - 1)).toEqual([]);
    expect(cuesBetween(plan, fall - 1, fall + 10)).toEqual(["land"]);
    expect(cuesBetween(plan, fall + 10, fall + 400)).toEqual([]);
  });

  it("pulses the winning four gently for a few seconds, never more than three times a second, then rests", () => {
    const samples = Array.from({ length: 1001 }, (_, at) => winGlow(at));
    const peaks = samples.filter((value, at) => at > 0 && at < 1000 && value > samples[at - 1] && value >= samples[at + 1]).length;
    expect(peaks).toBeLessThanOrEqual(3);
    expect(winGlow(0)).toBeCloseTo(0, 6);
    expect(Math.max(...samples)).toBeGreaterThan(0.9);
    expect(winGlow(WIN_MS)).toBe(0);
    expect(winGlow(WIN_MS + 500)).toBe(0);
    expect(WIN_MS).toBeLessThan(6000);
  });
});
