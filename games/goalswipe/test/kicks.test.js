import { describe, expect, it } from "vitest";
import { BONUS, REACH, aimText, diveText, onTarget, readAim, readDive, resolveKick, snapAim, snapDive } from "../src/kicks.js";

describe("a kick", () => {
  it("is written as two letters and read back to the same point, so both phones work out the same result", () => {
    for (const point of [{ x: 0.5, y: 0.5 }, { x: 0.02, y: 0.93 }, { x: 1.2, y: 0.1 }, { x: -0.2, y: 1.3 }]) {
      const snapped = snapAim(point);
      expect(aimText(snapped)).toMatch(/^[A-Za-z0-9_-]{2}$/);
      expect(readAim(aimText(snapped))).toEqual(snapped);
      expect(Math.abs(snapped.x - point.x)).toBeLessThan(0.02);
      expect(Math.abs(snapped.y - point.y)).toBeLessThan(0.02);
    }
    const dive = snapDive({ x: 0.8, y: 0.4 });
    expect(readDive(diveText(dive))).toEqual(dive);
  });

  it("keeps a shot within what a swipe can ask for and a dive inside the goal", () => {
    expect(snapAim({ x: 9, y: -3 })).toEqual(snapAim({ x: 1.3, y: 0 }));
    expect(snapDive({ x: -1, y: 4 })).toEqual({ x: 0, y: 1 });
  });

  it("refuses anything that is not two letters of its alphabet", () => {
    for (const bad of ["", "A", "ABC", "A!", 12, null, undefined]) {
      expect(readAim(bad), String(bad)).toBeNull();
      expect(readDive(bad), String(bad)).toBeNull();
    }
  });

  it("is on target between the posts and under the bar", () => {
    expect(onTarget({ x: 0.5, y: 0.5 })).toBe(true);
    expect(onTarget({ x: 0.06, y: 0.9 })).toBe(true);
    expect(onTarget({ x: -0.05, y: 0.5 })).toBe(false);
    expect(onTarget({ x: 1.02, y: 0.5 })).toBe(false);
    expect(onTarget({ x: 0.5, y: 1.05 })).toBe(false);
  });

  it("is a goal when the keeper dives elsewhere, saved within their reach, wide when it misses the goal", () => {
    const aim = { x: 0.2, y: 0.3 };
    expect(resolveKick(aim, { x: 0.8, y: 0.3 }, REACH.blind)).toEqual({ outcome: "goal", bonus: null });
    expect(resolveKick(aim, { x: 0.25, y: 0.35 }, REACH.blind)).toEqual({ outcome: "saved", bonus: null });
    expect(resolveKick(aim, null, REACH.blind)).toEqual({ outcome: "goal", bonus: null });
    expect(resolveKick({ x: 1.2, y: 0.3 }, { x: 0.9, y: 0.3 }, REACH.blind)).toEqual({ outcome: "wide", bonus: null });
    expect(resolveKick({ x: 0.5, y: 1.2 }, null, REACH.blind).outcome).toBe("wide");
  });

  it("measures the keeper's reach in goal heights, the goal being wider than tall", () => {
    const aim = { x: 0.5, y: 0.5 };
    expect(resolveKick(aim, { x: 0.5, y: 0.5 + 0.3 }, 0.31).outcome).toBe("saved");
    expect(resolveKick(aim, { x: 0.5 + 0.3, y: 0.5 }, 0.31).outcome).toBe("goal");
  });

  it("gives a bonus for a goal through the hanging tyre or on the bells, never for a saved shot", () => {
    const [tyre, bells] = BONUS;
    expect(tyre.kind).toBe("tyre");
    expect(bells.kind).toBe("bells");
    expect(resolveKick({ x: tyre.x, y: tyre.y }, { x: 0.1, y: 0.1 }, 0.3)).toEqual({ outcome: "goal", bonus: "tyre" });
    expect(resolveKick({ x: bells.x, y: bells.y }, null, 0.3)).toEqual({ outcome: "goal", bonus: "bells" });
    expect(resolveKick({ x: tyre.x, y: tyre.y }, { x: tyre.x, y: tyre.y }, 0.3)).toEqual({ outcome: "saved", bonus: null });
    for (const one of BONUS) expect(onTarget(one), one.kind).toBe(true);
  });
});
