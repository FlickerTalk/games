// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sealLive } from "../../../kit/src/live/wire.js";
import { MOST_HITS, encodeClaims, scheduleOf } from "../src/fair.js";
import { PROGRESS, settingsFor } from "../src/levels.js";
import { DUEL, checkState, stateOf } from "../src/wire.js";

const round = (mine) => ({ mine });

describe("what a phone says of its round", () => {
  it("is its own claims and two flags, nothing about the other player", () => {
    const said = stateOf(round([{ id: 3, t: 120, seat: 0 }, { id: 9, t: 300, seat: 0 }]), { paused: false, ended: false });
    expect(said).toEqual({ c: encodeClaims([{ id: 3, t: 120 }, { id: 9, t: 300 }]), p: 0, e: 0 });
    expect(stateOf(round([]), { paused: true, ended: true })).toEqual({ c: "", p: 1, e: 1 });
    expect(DUEL).toEqual({ g: "balloonfair", gv: 1 });
  });

  it("is rebuilt field by field when heard, and refused when anything is off", () => {
    expect(checkState({ c: "AAAB", p: 0, e: 1, extra: "x" })).toEqual({ c: "AAAB", p: 0, e: 1 });
    for (const bad of [null, [], "x", { c: "AAA", p: 0, e: 0 }, { c: "AAAB", p: 2, e: 0 }, { c: "AAAB", p: 0 }, { c: 5, p: 0, e: 0 }, { c: "A".repeat(4 * MOST_HITS + 4), p: 0, e: 0 }]) {
      expect(checkState(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("fits in one tick even when one player popped every balloon of a round between two phones", () => {
    const schedule = scheduleOf("ZZZZZZZZ", settingsFor(PROGRESS.fresh(), "friend"));
    const everything = schedule.flatMap((one) => [{ id: one.id, t: 2199 }, { id: one.id, t: 2199 }]);
    const fullest = stateOf(round(everything.slice(0, MOST_HITS)), { paused: true, ended: true });
    const id = "z".repeat(32);
    expect(() => sealLive({ ...DUEL, k: "tick", doc: id, who: id, t: 3_599_999.123, s: { g: fullest, o: -123456 } })).not.toThrow();
  });
});
