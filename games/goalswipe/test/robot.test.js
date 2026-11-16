import { describe, expect, it } from "vitest";
import { randomOf } from "../../../kit/src/canvas/random.js";
import { onTarget, resolveKick, snapAim } from "../src/kicks.js";
import { flickAim, flickDive } from "../src/robot.js";

const FLICK_REACH = 0.42;

function shareOf(count, run) {
  let hits = 0;
  for (let at = 0; at < count; at += 1) if (run(randomOf(`robot/${at}`))) hits += 1;
  return hits / count;
}

describe("Flick taking a penalty", () => {
  it("shoots at the goal most of the time and misses it now and then, more often while still learning", () => {
    const early = shareOf(600, (random) => onTarget(flickAim(random, { skill: 0.4 })));
    const late = shareOf(600, (random) => onTarget(flickAim(random, { skill: 0.82 })));
    expect(early).toBeGreaterThan(0.7);
    expect(early).toBeLessThan(0.92);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThan(1);
  });

  it("shoots at points two letters can carry, on both sides of the goal and at every height", () => {
    const aims = Array.from({ length: 200 }, (_, at) => flickAim(randomOf(`aim/${at}`), { skill: 0.6 }));
    for (const aim of aims) expect(snapAim(aim)).toEqual(aim);
    expect(aims.some((aim) => aim.x < 0.3)).toBe(true);
    expect(aims.some((aim) => aim.x > 0.7)).toBe(true);
    expect(aims.some((aim) => aim.y > 0.6)).toBe(true);
    expect(aims.some((aim) => aim.y < 0.3)).toBe(true);
  });
});

describe("Flick in goal", () => {
  const saved = (aim, skill) => shareOf(800, (random) => resolveKick(aim, flickDive(aim, random, { skill }), FLICK_REACH).outcome === "saved");

  it("saves a shot at the middle far more often than one in a corner", () => {
    const middle = saved(snapAim({ x: 0.5, y: 0.35 }), 0.6);
    const corner = saved(snapAim({ x: 0.08, y: 0.85 }), 0.6);
    expect(middle).toBeGreaterThan(corner + 0.15);
    expect(corner).toBeGreaterThan(0.05);
  });

  it("can always be beaten and always saves some, at every level", () => {
    for (const skill of [0.2, 0.4, 0.82]) {
      for (const aim of [{ x: 0.5, y: 0.35 }, { x: 0.15, y: 0.3 }, { x: 0.9, y: 0.8 }].map(snapAim)) {
        const share = saved(aim, skill);
        expect(share, `${skill} ${JSON.stringify(aim)}`).toBeGreaterThan(0.03);
        expect(share, `${skill} ${JSON.stringify(aim)}`).toBeLessThan(0.9);
      }
    }
  });

  it("saves more as the levels go up", () => {
    const aim = snapAim({ x: 0.25, y: 0.4 });
    expect(saved(aim, 0.82)).toBeGreaterThan(saved(aim, 0.4) + 0.1);
  });

  it("dives somewhere inside the goal even when the shot goes wide", () => {
    for (let at = 0; at < 50; at += 1) {
      const dive = flickDive(snapAim({ x: 1.25, y: 0.4 }), randomOf(`wide/${at}`), { skill: 0.6 });
      expect(dive.x).toBeGreaterThanOrEqual(0);
      expect(dive.x).toBeLessThanOrEqual(1);
      expect(dive.y).toBeGreaterThanOrEqual(0);
      expect(dive.y).toBeLessThanOrEqual(1);
    }
  });
});
