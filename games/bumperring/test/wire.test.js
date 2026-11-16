// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sealLive } from "../../../kit/src/live/wire.js";
import { CHARGE_STEPS, OUT, SAFE, STUN } from "../src/body.js";
import { KEPT_PUSHES, createMatch } from "../src/match.js";
import { DUEL, checkState, stateOf } from "../src/wire.js";

const SAID = { look: "coral", paused: false, ended: false };
const through = (value) => JSON.parse(JSON.stringify(value));

function busy() {
  const match = createMatch({ seed: "wire0001", variant: "bar", roundSteps: 7200 });
  Object.assign(match.bodies[0], { x: -0.123456789, y: 0.7000000000000001, vx: -2.123456789, vy: 1.98765432, ax: 0.6, ay: -0.8, hold: 57, stun: 3, lost: 2 });
  match.told[0] = Array.from({ length: KEPT_PUSHES }, (_, at) => [100000 - at, -2.123456789, 3.987654321]);
  return match;
}

describe("what a phone tells the other while playing", () => {
  it("names the game and its version for the live channel", () => {
    expect(DUEL).toEqual({ g: "bumperring", gv: 1 });
  });

  it("says where its own player is and what it is doing, its falls, its ring and the shoves it gave, and nothing about the other player", () => {
    const match = busy();
    match.bodies[1].x = 0.9;
    const state = stateOf(match, 0, SAID);
    expect(state).toMatchObject({ x: -0.1235, y: 0.7, vx: -2.1235, vy: 1.9877, ax: 0.6, ay: -0.8, c: 57, q: 3, u: 0, s: 0, l: 2, k: "coral", p: 0, e: 0 });
    expect(state.h).toHaveLength(KEPT_PUSHES);
    expect(state.h[0]).toEqual([100000, -2.1235, 3.9877]);
    expect(JSON.stringify(state)).not.toContain("0.9");
    expect(checkState(through(state))).toEqual(state);
    expect(stateOf(match, 1, { look: "aqua", paused: true, ended: true })).toMatchObject({ k: "aqua", p: 1, e: 1, h: [] });
  });

  it("stays well under the size of a tick at its largest", () => {
    const state = stateOf(busy(), 0, { look: "sunny", paused: true, ended: true });
    const sealed = sealLive({ g: DUEL.g, gv: DUEL.gv, k: "tick", doc: "d".repeat(22), who: "w".repeat(22), t: 123456.789, s: { g: state, o: -123456 } });
    expect(JSON.stringify(state).length).toBeLessThan(400);
    expect(sealed.length).toBeGreaterThan(100);
  });

  it("refuses anything out of shape or out of range, and reads an unknown ring as a known one", () => {
    const good = through(stateOf(busy(), 0, SAID));
    expect(checkState(good)).not.toBeNull();
    expect(checkState(null)).toBeNull();
    expect(checkState([good])).toBeNull();
    for (const [key, value] of [["x", 9], ["y", "0"], ["vx", 50], ["ax", 2], ["c", CHARGE_STEPS * 100], ["c", 1.5], ["q", STUN + 1], ["u", OUT + 1], ["s", SAFE + 1], ["l", -1], ["l", 2.5], ["p", 2], ["e", null], ["h", "x"]]) {
      expect(checkState({ ...good, [key]: value }), `${key} ${value}`).toBeNull();
    }
    expect(checkState({ ...good, h: [[1, 0, 99]] })).toBeNull();
    expect(checkState({ ...good, h: [[0, 0, 1]] })).toBeNull();
    expect(checkState({ ...good, h: [[1, 0]] })).toBeNull();
    expect(checkState({ ...good, h: new Array(KEPT_PUSHES + 1).fill([1, 0, 1]) })).toBeNull();
    expect(checkState({ ...good, k: "<script>" }).k).toBe("coral");
    expect(checkState({ ...good, extra: 1 })).not.toHaveProperty("extra");
  });
});
