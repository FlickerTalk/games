// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sealLive } from "../../../kit/src/live/wire.js";
import { MOST_EXCHANGES, STEPS_PER_SECOND, WINDOW_MS, encodeClaims } from "../src/duel.js";
import { DUEL, MOST_STEPS, checkState, stateOf } from "../src/wire.js";

const round = (mine, step = 0) => ({ seat: 0, step, claims: [mine, []] });

describe("what a phone says of its duel", () => {
  it("is its own reaction times, how far its round is and two flags, nothing about the other player", () => {
    const mine = [{ x: 0, r: 312, seat: 0 }, { x: 2, r: 0, seat: 0 }];
    expect(stateOf(round(mine, 431), { paused: false, ended: false })).toEqual({ c: encodeClaims(mine), n: 431, p: 0, e: 0 });
    expect(stateOf({ seat: 1, step: 9, claims: [mine, []] }, { paused: true, ended: true })).toEqual({ c: "", n: 9, p: 1, e: 1 });
    expect(DUEL).toEqual({ g: "foamduel", gv: 1 });
    expect(MOST_STEPS).toBe(90 * STEPS_PER_SECOND);
  });

  it("is rebuilt field by field when heard, and refused when anything is off", () => {
    expect(checkState({ c: "AEA", n: 12, p: 0, e: 1, extra: "x" })).toEqual({ c: "AEA", n: 12, p: 0, e: 1 });
    for (const bad of [null, [], "x", { c: "AE", n: 1, p: 0, e: 0 }, { c: "AEA", n: 1, p: 2, e: 0 }, { c: "AEA", n: 1, p: 0 }, { c: 5, n: 1, p: 0, e: 0 }, { c: "AEA", n: -1, p: 0, e: 0 }, { c: "AEA", n: 1.5, p: 0, e: 0 }, { c: "AEA", n: MOST_STEPS + 1, p: 0, e: 0 }, { c: "AEA", p: 0, e: 0 }]) {
      expect(checkState(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("fits in one tick with a report for every exchange a round can have", () => {
    const every = Array.from({ length: MOST_EXCHANGES }, (_, x) => ({ x, r: WINDOW_MS, seat: 0 }));
    const fullest = stateOf(round(every, MOST_STEPS), { paused: true, ended: true });
    const id = "z".repeat(32);
    expect(() => sealLive({ ...DUEL, k: "tick", doc: id, who: id, t: 3_599_999.123, s: { g: fullest, o: -123456 } })).not.toThrow();
  });
});
