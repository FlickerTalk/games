import { describe, expect, it } from "vitest";
import { checkCurve, curveAt, plateauOf } from "../../src/progress/curve.js";

const RACER = checkCurve({
  topSpeed: { first: 9, step: 1, limit: 13 },
  rivalSpeed: { first: 0.78, step: 0.02, limit: 0.85, eased: -0.1 },
  rivalMistakes: { first: 0.5, step: -0.05, limit: 0.3, eased: 0.25 },
  trackLength: { first: 320, step: 40, limit: 520 },
});

describe("a game's difficulty curve", () => {
  it("gives each value as declared on level one, moved by its step on each level after", () => {
    expect(curveAt(RACER, 1)).toEqual({ topSpeed: 9, rivalSpeed: 0.78, rivalMistakes: 0.5, trackLength: 320 });
    const third = curveAt(RACER, 3);
    expect(third.topSpeed).toBe(11);
    expect(third.rivalSpeed).toBeCloseTo(0.82, 10);
    expect(third.rivalMistakes).toBeCloseTo(0.4, 10);
    expect(third.trackLength).toBe(400);
  });

  it("stops each value at its limit, so from the plateau on every level is the same, level 6 with the racer's numbers", () => {
    expect(plateauOf(RACER)).toBe(6);
    expect(curveAt(RACER, 5)).not.toEqual(curveAt(RACER, 6));
    for (const level of [7, 12, 30, 5000]) expect(curveAt(RACER, level), `level ${level}`).toEqual(curveAt(RACER, 6));
    expect(curveAt(RACER, 6)).toEqual({ topSpeed: 13, rivalSpeed: 0.85, rivalMistakes: 0.3, trackLength: 520 });
  });

  it("never gets easier from one level to the next", () => {
    for (let level = 2; level <= 40; level += 1) {
      const before = curveAt(RACER, level - 1);
      const now = curveAt(RACER, level);
      for (const [name, { step }] of Object.entries(RACER)) {
        expect(Math.sign(now[name] - before[name]) * Math.sign(step), `${name} at level ${level}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("moves each value by its eased amount when the round is eased, and leaves the others alone", () => {
    for (const level of [1, 5, 30]) {
      const fresh = curveAt(RACER, level);
      const eased = curveAt(RACER, level, true);
      expect(eased.rivalSpeed).toBeCloseTo(fresh.rivalSpeed - 0.1, 10);
      expect(eased.rivalMistakes).toBeCloseTo(fresh.rivalMistakes + 0.25, 10);
      expect([eased.topSpeed, eased.trackLength]).toEqual([fresh.topSpeed, fresh.trackLength]);
    }
  });

  it("reads a level below one or not a whole number as the whole level below it, at least one", () => {
    expect(curveAt(RACER, 0)).toEqual(curveAt(RACER, 1));
    expect(curveAt(RACER, Number.NaN)).toEqual(curveAt(RACER, 1));
    expect(curveAt(RACER, 3.7)).toEqual(curveAt(RACER, 3));
  });

  it("can be empty: no values, and the plateau is level one", () => {
    const none = checkCurve({});
    expect(curveAt(none, 9)).toEqual({});
    expect(plateauOf(none)).toBe(1);
  });

  it("finds a plateau that a step not dividing the distance evenly reaches, without being fooled by rounding", () => {
    expect(plateauOf(checkCurve({ hazards: { first: 3, step: 1.5, limit: 8 } }))).toBe(5);
    expect(plateauOf(checkCurve({ pace: { first: 0.78, step: 0.02, limit: 0.86 } }))).toBe(5);
    expect(plateauOf(checkCurve({ fixed: { first: 2, step: 1, limit: 2 } }))).toBe(1);
  });

  it("is checked when the game is defined, and a mistake names the value it is in", () => {
    const broken = [
      [null, "curve"],
      [[], "curve"],
      [{ speed: 9 }, "speed"],
      [{ speed: { first: 9, step: 1 } }, "speed"],
      [{ speed: { first: "9", step: 1, limit: 13 } }, "speed"],
      [{ speed: { first: 9, step: Number.NaN, limit: 13 } }, "speed"],
      [{ speed: { first: 9, step: 0, limit: 13 } }, "step other than 0"],
      [{ speed: { first: 9, step: -1, limit: 13 } }, "never reaches its limit"],
      [{ speed: { first: 9, step: 1, limit: 13, eased: "less" } }, "eases"],
    ];
    for (const [curve, message] of broken) expect(() => checkCurve(curve), JSON.stringify(curve)).toThrow(message);
    expect(() => checkCurve({ speed: { first: 9, step: 1, limit: 13 } })).not.toThrow();
  });

  it("keeps its own copy of what was declared, so changing the declaration later changes nothing", () => {
    const declared = { speed: { first: 1, step: 1, limit: 3 } };
    const curve = checkCurve(declared);
    declared.speed.limit = 99;
    expect(curveAt(curve, 50)).toEqual({ speed: 3 });
    expect(Object.isFrozen(curve) && Object.isFrozen(curve.speed)).toBe(true);
  });
});
