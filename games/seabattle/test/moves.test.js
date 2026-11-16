import { describe, expect, it } from "vitest";
import { BURST_AT, BURST_MS, SPLASH_MS, TIP_MS, cuesBetween, effectFrame, planShots } from "../src/moves.js";
import { DEFAULT_FLEET, commitText, honestAnswer, initial, play, turn } from "../src/rules.js";

const SALT = new Uint8Array(24).fill(0x5a);

function after(state, ...cells) {
  let next = state;
  for (const cell of cells) {
    const side = turn(next);
    next = play(next, `${honestAnswer(next, side, DEFAULT_FLEET)}>${cell}`, side).state;
  }
  return next;
}

const placed = after(play(play(initial(), commitText(SALT, DEFAULT_FLEET), 0).state, commitText(SALT, DEFAULT_FLEET), 1).state);

describe("how a shot is shown", () => {
  it("splashes the answer to the user's shot on the other side's sea when it comes back", () => {
    const fired = after(placed, 0);
    expect(planShots(placed, fired, 0, DEFAULT_FLEET)).toEqual([]);
    const missed = after(fired, 99);
    expect(planShots(fired, missed, 0, DEFAULT_FLEET)).toEqual([{ sea: "theirs", cell: 0, kind: "m", ship: null }, { sea: "mine", cell: 99, kind: "m", ship: null }]);
    const aimed = after(missed, 11);
    expect(planShots(aimed, after(aimed, 98), 0, DEFAULT_FLEET)[0]).toEqual({ sea: "theirs", cell: 11, kind: "h", ship: null });
  });

  it("shows where the other side fired on the user's own sea at once, read from the user's fleet", () => {
    const fired = after(placed, 0);
    expect(planShots(fired, after(fired, 58), 0, DEFAULT_FLEET)[1]).toEqual({ sea: "mine", cell: 58, kind: "h", ship: null });
    const sinking = after(after(fired, 58), 1);
    expect(planShots(sinking, after(sinking, 68), 0, DEFAULT_FLEET)[1]).toEqual({ sea: "mine", cell: 68, kind: "s", ship: DEFAULT_FLEET[3] });
    expect(planShots(fired, after(fired, 58), 0, null).map((effect) => effect.sea)).toEqual(["theirs"]);
  });

  it("finds the boat a sinking answer names, and shows nothing across rounds or without a state before", () => {
    const state = after(placed, 58, 0, 68);
    const sunk = after(state, 1);
    expect(planShots(state, sunk, 0, DEFAULT_FLEET)).toEqual(expect.arrayContaining([{ sea: "theirs", cell: 68, kind: "s", ship: { start: 58, o: "v", len: 2 } }]));
    expect(planShots(null, sunk, 0, DEFAULT_FLEET)).toEqual([]);
    expect(planShots(sunk, initial(), 0, DEFAULT_FLEET)).toEqual([]);
  });

  it("lands a splash, then bursts stars and lets a found boat laugh for a while", () => {
    const miss = { kind: "m" };
    expect(effectFrame(miss, 0)).toMatchObject({ progress: 0, burst: null, done: false });
    expect(effectFrame(miss, SPLASH_MS)).toMatchObject({ progress: 1, done: true });
    const sunk = { kind: "s" };
    expect(effectFrame(sunk, BURST_AT - 1).burst).toBeNull();
    expect(effectFrame(sunk, BURST_AT + BURST_MS / 2).burst).toBeCloseTo(0.5, 5);
    expect(effectFrame(sunk, TIP_MS / 2).tipping).toBeCloseTo(0.5, 5);
    expect(effectFrame(sunk, TIP_MS / 2).done).toBe(false);
    expect(effectFrame(sunk, Math.max(TIP_MS, BURST_AT + BURST_MS)).done).toBe(true);
  });

  it("sounds the answer to the user's shot as it lands: water, paint, or a boat found", () => {
    const effects = [{ sea: "theirs", kind: "m" }, { sea: "mine", kind: "h" }];
    expect(cuesBetween(effects, -1, SPLASH_MS)).toEqual(["splash"]);
    expect(cuesBetween(effects, SPLASH_MS, SPLASH_MS * 2)).toEqual([]);
    expect(cuesBetween([{ sea: "theirs", kind: "h" }], -1, 1000)).toEqual(["tick"]);
    expect(cuesBetween([{ sea: "theirs", kind: "s" }], -1, 1000)).toEqual(["success"]);
  });
});
