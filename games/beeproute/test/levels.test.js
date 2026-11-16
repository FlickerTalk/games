import { describe, expect, it } from "vitest";
import { LOOKS, PROGRESS, TRIES, pointsFor, roundSetup, wonRound } from "../src/levels.js";

const after = (results) => results.reduce((record, won) => PROGRESS.awardRound(record, { won, score: 100 }).record, PROGRESS.fresh());

describe("the levels", () => {
  it("are a thinking puzzle with no timer, starting small with one turn and nothing to collect", () => {
    expect(PROGRESS.spec.timed).toBe(false);
    const first = roundSetup(PROGRESS.fresh());
    expect(first.level).toBe(1);
    expect(first.values).toMatchObject({ size: 5, turns: 1, batteries: 0, doors: 0 });
    expect(first.loops).toBe(false);
    expect(first.seconds).toBeUndefined();
  });

  it("grow gently: bigger grids, more turns, batteries, then doors and rings, and stop growing by level ten", () => {
    const at = (level) => roundSetup({ ...PROGRESS.fresh(), level }).values;
    expect(at(4).size).toBeLessThan(6);
    expect(Math.floor(at(5).size)).toBe(6);
    expect(Math.floor(at(9).size)).toBe(7);
    expect(Math.floor(at(4).batteries)).toBe(1);
    expect(Math.floor(at(6).doors)).toBe(0);
    expect(Math.floor(at(8).doors)).toBe(1);
    expect(roundSetup({ ...PROGRESS.fresh(), level: 4 }).loops).toBe(false);
    expect(roundSetup({ ...PROGRESS.fresh(), level: 5 }).loops).toBe(true);
    expect(PROGRESS.plateau).toBeLessThanOrEqual(10);
    for (const level of [1, 3, 6, 9]) for (const [name, value] of Object.entries(at(level + 1))) expect(value, `${name} at ${level}`).toBeGreaterThanOrEqual(at(level)[name]);
  });

  it("ease off after two levels that took many tries, and let the player through after three", () => {
    const twice = after([false, false]);
    const eased = roundSetup(twice);
    expect(eased.eased).toBe(true);
    expect(eased.values.turns).toBeLessThan(roundSetup({ ...twice, losses: 0 }).values.turns);
    const through = PROGRESS.awardRound(twice, { won: false, score: 100 });
    expect(through.passed).toBe(true);
    expect(through.record.level).toBe(2);
  });

  it("count a level solved within three tries as won", () => {
    expect(TRIES).toBe(3);
    expect(wonRound(0)).toBe(true);
    expect(wonRound(3)).toBe(true);
    expect(wonRound(4)).toBe(false);
  });

  it("give more stars to fewer commands, three for the shortest program or shorter", () => {
    expect(pointsFor(8, 8)).toBe(100);
    expect(pointsFor(6, 8)).toBe(100);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: pointsFor(9, 8) }).stars).toBe(2);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: pointsFor(10, 8) }).stars).toBe(2);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: pointsFor(11, 8) }).stars).toBe(1);
    expect(pointsFor(40, 4)).toBeGreaterThan(0);
  });

  it("hand out robots and worlds as looks only, four robots and the workshop owned from the start", () => {
    expect(LOOKS.robot).toEqual(["box", "capsule", "wide", "cone", "ball", "star"]);
    expect(LOOKS.world).toEqual(["workshop", "garden", "space"]);
    const owned = PROGRESS.owned(PROGRESS.fresh());
    expect(owned.sort()).toEqual(["box", "capsule", "cone", "wide", "workshop"]);
    expect(PROGRESS.fresh().chosen).toEqual({ robot: "box", world: "workshop" });
    const gifted = after([true, true]);
    expect(PROGRESS.owned(gifted)).toHaveLength(6);
  });
});
