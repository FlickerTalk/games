import { describe, expect, it } from "vitest";
import { BURST_MS, CHEER_MS, MISS_MS, PLACE_MS, RIBBON_MS, missFrame, placeFrame, planMove, winFrame } from "../src/moves.js";
import { initial, play, turn } from "../src/rules.js";

function after(...cells) {
  let state = initial();
  for (const cell of cells) state = play(state, cell, turn(state)).state;
  return state;
}

const peaks = (values) => values.filter((value, at) => at > 0 && at < values.length - 1 && value > values[at - 1] && value >= values[at + 1]).length;

describe("how a Tic-Tac-Toe move is shown", () => {
  it("places the piece of the side that played on the cell it played", () => {
    expect(planMove(after(4), after(4, 0), 0)).toEqual({ cell: 0, side: 1 });
    expect(planMove(initial(), after(4), 4)).toEqual({ cell: 4, side: 0 });
  });

  it("shows nothing placed when the new position does not follow from the old one by that move", () => {
    expect(planMove(after(4), after(4, 0), 2)).toBeNull();
    expect(planMove(after(4, 0), initial(), 0)).toBeNull();
    expect(planMove(after(4), after(4, 0, 2), 2)).toBeNull();
    expect(planMove(null, after(4), 4)).toBeNull();
    expect(planMove(initial(), after(4), null)).toBeNull();
  });

  it("pops the piece in, with a short burst round it, then rests", () => {
    expect(placeFrame(0)).toMatchObject({ grow: 0, burst: 0, done: false });
    expect(placeFrame(PLACE_MS / 2).grow).toBeCloseTo(0.5, 6);
    expect(placeFrame(PLACE_MS).grow).toBe(1);
    expect(placeFrame(BURST_MS / 2).burst).toBeCloseTo(0.5, 6);
    expect(placeFrame(BURST_MS)).toMatchObject({ grow: 1, burst: null, done: true });
  });

  it("draws the winning ribbon, and the winner's pieces cheer a few times, never more than three times a second, then rest", () => {
    expect(winFrame(0).ribbon).toBe(0);
    expect(winFrame(RIBBON_MS / 2).ribbon).toBeCloseTo(0.5, 6);
    expect(winFrame(RIBBON_MS).ribbon).toBe(1);
    const cheers = Array.from({ length: 201 }, (_, at) => winFrame((CHEER_MS * at) / 200).cheer);
    expect(peaks(cheers)).toBeGreaterThanOrEqual(2);
    expect(peaks(cheers) / (CHEER_MS / 1000)).toBeLessThanOrEqual(3);
    expect(Math.max(...cheers)).toBeLessThanOrEqual(1);
    const end = winFrame(Math.max(RIBBON_MS, CHEER_MS));
    expect(end).toMatchObject({ ribbon: 1, cheer: 0, done: true });
    expect(Math.abs(end.tilt)).toBeLessThan(1e-9);
  });

  it("shakes a taken cell that was tapped, a little and briefly", () => {
    const shakes = Array.from({ length: 101 }, (_, at) => missFrame((MISS_MS * at) / 100).shake);
    expect(Math.max(...shakes.map(Math.abs))).toBeGreaterThan(0.01);
    expect(Math.max(...shakes.map(Math.abs))).toBeLessThanOrEqual(0.05);
    expect(missFrame(MISS_MS / 2).ring).toBeCloseTo(0.5, 6);
    expect(missFrame(MISS_MS)).toMatchObject({ shake: 0, done: true });
  });
});
