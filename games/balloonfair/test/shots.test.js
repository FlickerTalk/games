// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FLIGHT, JAM, MIN_PULL, RELOAD, aimOf, fire, loose, newTool, stepShots, tankOf } from "../src/shots.js";

const UNIT = 360;
const FROM = { x: 180, y: 600 };
const BOUNDS = { x: 0, y: 100, w: 360, h: 460 };
const balloon = (id, x, y, kind = "round", r = 34) => ({ balloon: { id, kind }, x, y, r });

function run(tool, seen, from, steps) {
  const events = [];
  for (let step = from; step < from + steps; step += 1) events.push(...stepShots(tool, { step, seen: typeof seen === "function" ? seen(step) : seen, bounds: BOUNDS }));
  return events;
}

describe("the cork popgun", () => {
  it("sends a cork to the balloon under the finger, which pops when the cork arrives", () => {
    const tool = newTool("popgun");
    const seen = [balloon(4, 100, 300), balloon(7, 250, 300)];
    expect(fire(tool, { step: 10, from: FROM, at: { x: 110, y: 310 }, seen, unit: UNIT })).toMatchObject({ target: 4 });
    expect(run(tool, seen, 10, FLIGHT - 1)).toEqual([]);
    expect(run(tool, seen, 10 + FLIGHT - 1, 2)).toEqual([expect.objectContaining({ kind: "hit", id: 4 })]);
    expect(tool.shots).toEqual([]);
  });

  it("forgives a finger just beside a small balloon and takes the nearest of two", () => {
    const tool = newTool("popgun");
    const seen = [balloon(1, 100, 300, "small", 20), balloon(2, 150, 300, "small", 20)];
    expect(fire(tool, { step: 0, from: FROM, at: { x: 74, y: 300 }, seen, unit: UNIT }).target).toBe(1);
    const other = newTool("popgun");
    expect(fire(other, { step: 0, from: FROM, at: { x: 131, y: 300 }, seen, unit: UNIT }).target).toBe(2);
  });

  it("misses with a puff where nothing is, or when someone else popped the balloon first", () => {
    const tool = newTool("popgun");
    fire(tool, { step: 0, from: FROM, at: { x: 300, y: 200 }, seen: [], unit: UNIT });
    expect(run(tool, [], 0, FLIGHT + 1)).toEqual([{ kind: "miss", x: 300, y: 200 }]);
    fire(tool, { step: 40, from: FROM, at: { x: 100, y: 300 }, seen: [balloon(4, 100, 300)], unit: UNIT });
    expect(run(tool, [], 40, FLIGHT + 1)).toEqual([{ kind: "miss", x: 100, y: 300 }]);
  });

  it("needs a moment to reload", () => {
    const tool = newTool("popgun");
    const seen = [balloon(4, 100, 300)];
    fire(tool, { step: 0, from: FROM, at: { x: 100, y: 300 }, seen, unit: UNIT });
    expect(fire(tool, { step: RELOAD.popgun - 1, from: FROM, at: { x: 100, y: 300 }, seen, unit: UNIT })).toBeNull();
    expect(fire(tool, { step: RELOAD.popgun, from: FROM, at: { x: 100, y: 300 }, seen, unit: UNIT })).not.toBeNull();
  });

  it("only puffs a cloud, and then rests for a second", () => {
    const tool = newTool("popgun");
    const seen = [balloon(9, 100, 300, "cloud")];
    fire(tool, { step: 0, from: FROM, at: { x: 100, y: 300 }, seen, unit: UNIT });
    expect(run(tool, seen, 0, FLIGHT + 1)).toEqual([expect.objectContaining({ kind: "puff", id: 9 })]);
    expect(fire(tool, { step: FLIGHT + JAM - 2, from: FROM, at: { x: 100, y: 300 }, seen, unit: UNIT })).toBeNull();
    expect(fire(tool, { step: FLIGHT + JAM + 1, from: FROM, at: { x: 100, y: 300 }, seen, unit: UNIT })).not.toBeNull();
  });
});

describe("the water blaster", () => {
  it("pops everything inside its splash and nothing outside, then refills", () => {
    const tool = newTool("blaster");
    const seen = [balloon(1, 150, 300), balloon(2, 230, 330), balloon(3, 40, 120)];
    const shot = fire(tool, { step: 0, from: FROM, at: { x: 190, y: 310 }, seen, unit: UNIT });
    expect(shot.radius).toBeGreaterThan(UNIT * 0.2);
    const hits = run(tool, seen, 0, 30).filter((one) => one.kind === "hit").map((one) => one.id);
    expect(hits.sort()).toEqual([1, 2]);
    expect(tankOf(tool, 1)).toBeLessThan(0.1);
    expect(fire(tool, { step: RELOAD.blaster - 1, from: FROM, at: { x: 190, y: 310 }, seen, unit: UNIT })).toBeNull();
    expect(tankOf(tool, RELOAD.blaster)).toBe(1);
    expect(fire(tool, { step: RELOAD.blaster, from: FROM, at: { x: 190, y: 310 }, seen, unit: UNIT })).not.toBeNull();
  });

  it("puffs a cloud caught in the splash once, and rests", () => {
    const tool = newTool("blaster");
    const seen = [balloon(1, 150, 300), balloon(2, 200, 300, "cloud"), balloon(3, 230, 310, "cloud")];
    fire(tool, { step: 0, from: FROM, at: { x: 190, y: 310 }, seen, unit: UNIT });
    const events = run(tool, seen, 0, 30);
    expect(events.filter((one) => one.kind === "puff")).toHaveLength(2);
    expect(events.filter((one) => one.kind === "hit")).toHaveLength(1);
    expect(tool.jamUntil).toBeGreaterThan(JAM);
  });
});

describe("the suction-cup bow", () => {
  it("aims opposite to the pull, always upwards, harder the further it is pulled", () => {
    const straight = aimOf({ dx: 0, dy: 80 }, UNIT);
    expect(straight).toMatchObject({ dx: expect.closeTo(0, 9), dy: expect.closeTo(-1, 9) });
    const slanted = aimOf({ dx: 60, dy: 60 }, UNIT);
    expect(slanted.dx).toBeLessThan(0);
    expect(slanted.dy).toBeLessThan(0);
    expect(Math.hypot(slanted.dx, slanted.dy)).toBeCloseTo(1, 9);
    const down = aimOf({ dx: 50, dy: -80 }, UNIT);
    expect(down.dy).toBeLessThan(-0.2);
    expect(aimOf({ dx: 0, dy: 30 }, UNIT).pull).toBeLessThan(aimOf({ dx: 0, dy: 90 }, UNIT).pull);
    expect(aimOf({ dx: 0, dy: 900 }, UNIT).pull).toBe(1);
    expect(aimOf({ dx: 0, dy: MIN_PULL - 1 }, UNIT)).toBeNull();
  });

  it("does not shoot on a short pull", () => {
    const tool = newTool("bow");
    expect(loose(tool, { step: 0, from: FROM, pull: { dx: 0, dy: 5 }, unit: UNIT })).toBeNull();
    expect(tool.shots).toEqual([]);
  });

  it("flies an arrow through a row of balloons, popping each once, and is gone past the stall", () => {
    const tool = newTool("bow");
    const seen = [balloon(1, 180, 450), balloon(2, 184, 330), balloon(3, 176, 210), balloon(4, 320, 300)];
    expect(loose(tool, { step: 0, from: FROM, pull: { dx: 0, dy: 90 }, unit: UNIT })).not.toBeNull();
    const events = run(tool, seen, 0, 80);
    expect(events.filter((one) => one.kind === "hit").map((one) => one.id)).toEqual([1, 2, 3]);
    expect(tool.shots).toEqual([]);
  });

  it("holds one arrow at a time", () => {
    const tool = newTool("bow");
    loose(tool, { step: 0, from: FROM, pull: { dx: 0, dy: 90 }, unit: UNIT });
    expect(loose(tool, { step: 2, from: FROM, pull: { dx: 0, dy: 90 }, unit: UNIT })).toBeNull();
  });

  it("says a miss when the arrow met nothing", () => {
    const tool = newTool("bow");
    loose(tool, { step: 0, from: FROM, pull: { dx: 0, dy: 90 }, unit: UNIT });
    expect(run(tool, [], 0, 80).map((one) => one.kind)).toEqual(["miss"]);
  });
});
