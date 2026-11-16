// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DUEL, MOST_MOVES, checkState, stateOf } from "../src/wire.js";

const through = (value) => JSON.parse(JSON.stringify(value));

describe("what a phone tells the other while playing", () => {
  it("names the game and its version for the live channel", () => {
    expect(DUEL).toEqual({ g: "robotrumble", gv: 1 });
  });

  it("says the moves it has told so far, its robot, and whether it paused or ended", () => {
    const state = stateOf(["g", "b", "s"], { look: "wheel", paused: true, ended: false });
    expect(state).toEqual({ c: "gbs", k: "wheel", p: 1, e: 0 });
    expect(checkState(through(state))).toEqual(state);
  });

  it("stays far under the channel's limit with the longest round", () => {
    const state = stateOf(new Array(MOST_MOVES).fill("s"), { look: "propeller", paused: false, ended: true });
    expect(JSON.stringify(state).length).toBeLessThan(200);
    expect(checkState(through(state)).c).toHaveLength(MOST_MOVES);
  });

  it("refuses anything out of shape, and reads an unknown robot as a known one", () => {
    const good = through(stateOf(["g"], { look: "tall", paused: false, ended: false }));
    expect(checkState(null)).toBeNull();
    expect(checkState([])).toBeNull();
    expect(checkState({ ...good, c: "gx" })).toBeNull();
    expect(checkState({ ...good, c: ["g"] })).toBeNull();
    expect(checkState({ ...good, c: "g".repeat(MOST_MOVES + 1) })).toBeNull();
    expect(checkState({ ...good, p: 2 })).toBeNull();
    expect(checkState({ ...good, e: "1" })).toBeNull();
    expect(checkState({ ...good, k: "<script>" }).k).toBe("round");
    expect(checkState({ ...good, extra: 1 })).not.toHaveProperty("extra");
  });
});
