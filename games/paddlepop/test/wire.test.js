// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMatch } from "../src/match.js";
import { DUEL, checkState, stateOf } from "../src/wire.js";

const match = () => {
  const made = createMatch({ seed: "wire0001", speed: 0.75, roundSteps: 7200 });
  return { ...made, balls: [{ ...made.balls[0], v: 2, by: 0, x: 0.3125, y: 0.7000000000000001, vx: -0.123456789, vy: 0.98765, hits: 2 }] };
};

const through = (value) => JSON.parse(JSON.stringify(value));

describe("what a phone tells the other while playing", () => {
  it("names the game and its version for the live channel", () => {
    expect(DUEL).toEqual({ g: "paddlepop", gv: 1 });
  });

  it("says where its paddle is, its look, its score against it, and the balls it sent last, to the last bit", () => {
    const state = stateOf(match(), 0, { look: "dog", paused: false, ended: false });
    expect(state).toMatchObject({ x: 0.5, w: 0, k: "dog", p: 0, l: 0, e: 0, r: [0, 0, 0] });
    const read = checkState(through(state));
    expect(read.b).toEqual([{ i: 0, k: 0, v: 2, by: 0, x: 0.3125, y: 0.7000000000000001, vx: -0.123456789, vy: 0.98765, sp: 0.75, slow: 0, hits: 2 }]);
    expect(read).toMatchObject({ x: 0.5, w: 0, k: "dog", p: 0, l: 0, e: 0, r: [0, 0, 0] });
  });

  it("says nothing about balls the other phone sent last, and stays small", () => {
    const state = stateOf(match(), 1, { look: "cat", paused: true, ended: true });
    expect(state.b).toEqual([]);
    expect(state).toMatchObject({ p: 1, e: 1 });
    const twoBalls = { ...match(), balls: [match().balls[0], { ...match().balls[0], i: 1 }] };
    expect(JSON.stringify(stateOf(twoBalls, 0, { look: "caterpillar", paused: false, ended: false })).length).toBeLessThan(600);
  });

  it("refuses anything out of shape or out of range, and reads an unknown look as a known one", () => {
    const good = through(stateOf(match(), 0, { look: "dog", paused: false, ended: false }));
    expect(checkState(null)).toBeNull();
    expect(checkState({ ...good, x: 2 })).toBeNull();
    expect(checkState({ ...good, l: -1 })).toBeNull();
    expect(checkState({ ...good, l: 1.5 })).toBeNull();
    expect(checkState({ ...good, r: [0, 0] })).toBeNull();
    expect(checkState({ ...good, b: [[0, 0, 2, 0, 0.3, 0.7, 0.1, 9, 0.75, 0, 2]] })).toBeNull();
    expect(checkState({ ...good, b: new Array(3).fill(good.b[0]) })).toBeNull();
    expect(checkState({ ...good, b: [[0, 0, 2, 0, "x", 0.7, 0.1, 0.9, 0.75, 0, 2]] })).toBeNull();
    expect(checkState({ ...good, k: "<script>" }).k).toBe("cat");
    expect(checkState({ ...good, extra: 1 })).not.toHaveProperty("extra");
  });
});
