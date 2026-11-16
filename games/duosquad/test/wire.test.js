// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sealLive } from "../../../kit/src/live/wire.js";
import { newCraft } from "../src/crafts.js";
import { DUEL, checkState, stateOf } from "../src/wire.js";
import { MOST_CLAIMS, encodeClaims } from "../src/waves.js";

function round(mine, change = {}) {
  const crafts = [newCraft(0), newCraft(1)];
  Object.assign(crafts[1], change);
  return { seat: 1, mine, crafts };
}

describe("what a phone says of its round", () => {
  it("is where its own craft is, whether it is caught, its own claims and its look: nothing about the other player", () => {
    const said = stateOf(round([{ id: 3, t: 120, seat: 1 }], { u: 0.123456789, caught: 17 }), { hull: 5, paused: false, ended: false });
    expect(said).toEqual({ u: 0.1235, c: 1, k: encodeClaims([{ id: 3, t: 120 }]), h: 5, p: 0, e: 0 });
    expect(stateOf(round([]), { hull: 0, paused: true, ended: true })).toMatchObject({ c: 0, k: "", p: 1, e: 1 });
    expect(DUEL).toEqual({ g: "duosquad", gv: 1 });
  });

  it("is rebuilt field by field when heard, and refused when anything is off", () => {
    const good = { u: 0.5, c: 0, k: "AAAB", h: 2, p: 0, e: 1 };
    expect(checkState({ ...good, extra: "x" })).toEqual(good);
    expect(checkState({ ...good, h: 99 }).h).toBe(0);
    const bad = [null, [], "x", { ...good, u: 1.5 }, { ...good, u: "0.5" }, { ...good, u: Number.NaN }, { ...good, c: 2 }, { ...good, k: "AAA" }, { ...good, p: 3 }, { ...good, e: undefined }, { ...good, k: "A".repeat(4 * MOST_CLAIMS + 4) }];
    for (const one of bad) expect(checkState(one), JSON.stringify(one)).toBeNull();
  });

  it("fits in one tick with the longest list of claims a round can hold", () => {
    const everything = Array.from({ length: MOST_CLAIMS }, (_, id) => ({ id, t: 3599 }));
    const fullest = stateOf(round(everything, { u: 0.9399, caught: 1 }), { hull: 7, paused: true, ended: true });
    const id = "z".repeat(32);
    expect(() => sealLive({ ...DUEL, k: "tick", doc: id, who: id, t: 3_599_999.123, s: { g: fullest, o: -123456 } })).not.toThrow();
  });
});
