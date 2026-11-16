import { describe, expect, it } from "vitest";
import { TICK_LIMIT } from "../../../kit/src/live/wire.js";
import { OUT_SHOW, SAFE } from "../src/craft.js";
import { LOCK, createMatch } from "../src/match.js";
import { DUEL, checkState, stateOf } from "../src/wire.js";

const SAID = { craft: "jet", colour: "coral", paused: false, ended: false };

function busiest() {
  const match = createMatch({ seed: "seedAAAA", twists: 4, roundSteps: 4200, families: ["helicopter", "plane"] });
  Object.assign(match.crafts[0], { x: -287.123456789, y: 299.987654321, hx: -0.70710678, hy: 0.70710678, speed: 0.6234567, lock: LOCK - 0.123456, safe: SAFE, out: OUT_SHOW, boost: 150, rest: 108, bank: -1, down: true, lost: 3 });
  return match;
}

describe("what one phone tells the other", () => {
  it("is named for this game", () => {
    expect(DUEL).toEqual({ g: "skychase", gv: 1 });
  });

  it("carries its own aircraft and its own balloons, and comes back the same through the check", () => {
    const match = createMatch({ seed: "seedAAAA", twists: 0, roundSteps: 4200 });
    Object.assign(match.crafts[1], { x: 1.23456789, y: -0.5, lock: 12.5, lost: 2, down: true, bank: 1 });
    const told = stateOf(match, 1, SAID);
    expect(told).toMatchObject({ x: 1.2346, y: -0.5, hx: 0, hy: 1, a: 12.5, l: 2, d: 1, n: 1, k: "jet", c: "coral", p: 0, e: 0 });
    expect(checkState(JSON.parse(JSON.stringify(told)))).toEqual(told);
    expect(stateOf(match, 1, { ...SAID, paused: true, ended: true })).toMatchObject({ p: 1, e: 1 });
  });

  it("stays far under what a tick may carry, even at its largest", () => {
    const told = stateOf(busiest(), 0, { craft: "propeller", colour: "sunny", paused: true, ended: true });
    expect(checkState(told)).toEqual(told);
    expect(new TextEncoder().encode(JSON.stringify(told)).length).toBeLessThan(TICK_LIMIT * 0.4);
  });

  it("turns down anything out of range or of the wrong kind, field by field", () => {
    const good = stateOf(busiest(), 0, SAID);
    expect(checkState(good)).not.toBeNull();
    const bad = { x: 9999, y: "1", hx: 1.5, hy: Number.NaN, v: -1, a: LOCK * 3, s: 1.5, u: -1, b: 9999, r: 9999, n: 2, d: 3, l: 4, p: 2, e: "1" };
    for (const [key, value] of Object.entries(bad)) expect(checkState({ ...good, [key]: value }), key).toBeNull();
    for (const key of Object.keys(bad)) {
      const { [key]: gone, ...rest } = good;
      expect(checkState(rest), `${key} ${gone}`).toBeNull();
    }
    for (const nothing of [null, undefined, 7, "x", []]) expect(checkState(nothing)).toBeNull();
  });

  it("falls back to an aircraft and a colour it knows, and drops what it did not ask for", () => {
    const good = stateOf(busiest(), 0, SAID);
    const read = checkState({ ...good, k: "tank", c: "gold", extra: "x".repeat(900) });
    expect(read.k).toBe("propeller");
    expect(read.c).toBe("sunny");
    expect(read.extra).toBeUndefined();
  });
});
