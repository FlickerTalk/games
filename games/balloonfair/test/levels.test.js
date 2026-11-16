// @vitest-environment node
import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { PROGRESS, SCENERIES, TOOLS, settingsFor, wonRound } from "../src/levels.js";

describe("levels, stars and gifts", () => {
  it("offers the three toys from the start and the day fair, with the pier and the evening fair as wrapped gifts", () => {
    expect(TOOLS).toEqual(["popgun", "blaster", "bow"]);
    expect(SCENERIES).toEqual(["day", "beach", "evening"]);
    const fresh = PROGRESS.fresh();
    expect(PROGRESS.owned(fresh)).toEqual(["day"]);
    expect(fresh.chosen).toBe("day");
    expect(PROGRESS.schedule.map(({ look }) => look)).toEqual(["beach", "evening"]);
  });

  it("gives a round its level's balloons, their rise, Flick's skill and its length, eased after two losses", () => {
    const first = settingsFor(PROGRESS.fresh(), "flick");
    expect(first).toMatchObject({ level: 1, eased: false, seconds: 35 });
    const later = settingsFor({ ...PROGRESS.fresh(), level: 9 }, "flick");
    for (const key of ["rate", "rise", "skill"]) expect(later[key], key).toBeGreaterThan(first[key]);
    expect(later.seconds).toBe(roundSeconds(9));
    const eased = settingsFor({ ...PROGRESS.fresh(), level: 9, losses: 2 }, "flick");
    expect(eased.eased).toBe(true);
    for (const key of ["rate", "rise", "skill"]) expect(eased[key], key).toBeLessThan(later[key]);
    expect(settingsFor({ ...PROGRESS.fresh(), level: 9 }, "alone")).toEqual(later);
  });

  it("plays a round with a person at the same settings on both phones, whatever their levels", () => {
    const one = settingsFor({ ...PROGRESS.fresh(), level: 2 }, "friend");
    const two = settingsFor({ ...PROGRESS.fresh(), level: 14, losses: 2 }, "friend");
    expect(one).toEqual(two);
    expect(one.seconds).toBeGreaterThanOrEqual(35);
    expect(one.seconds).toBeLessThanOrEqual(90);
  });

  it("counts a round as won with at least the other's pops, or alone with two stars", () => {
    expect(wonRound("flick", 12, 9)).toBe(true);
    expect(wonRound("friend", 9, 9)).toBe(true);
    expect(wonRound("flick", 3, 9)).toBe(false);
    expect(wonRound("alone", PROGRESS.spec.stars.two, 0)).toBe(true);
    expect(wonRound("alone", PROGRESS.spec.stars.two - 1, 0)).toBe(false);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 40 }).stars).toBe(3);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 2 }).stars).toBe(1);
  });
});
