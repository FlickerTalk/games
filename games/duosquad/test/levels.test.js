import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { HULLS, PROGRESS, WORLDS, ZONES, hullOf, settingsFor, wonRound, zoneFor } from "../src/levels.js";

describe("the worlds", () => {
  it("are space, the sea and the desert, each with eight crafts and three places", () => {
    expect(WORLDS).toEqual(["space", "sea", "land"]);
    for (const world of WORLDS) {
      expect(HULLS[world]).toHaveLength(8);
      expect(ZONES[world]).toHaveLength(3);
      for (const hull of HULLS[world]) expect(hull.startsWith(`${world}-`)).toBe(true);
    }
  });

  it("give two crafts of each world from the start and the rest as gifts, a look and nothing else", () => {
    const fresh = PROGRESS.fresh();
    const owned = PROGRESS.owned(fresh);
    for (const world of WORLDS) {
      expect(owned.filter((look) => HULLS[world].includes(look))).toEqual(HULLS[world].slice(0, 2));
      expect(hullOf(fresh, world)).toBe(HULLS[world][0]);
    }
    expect(PROGRESS.spec.gifts.looks).toHaveLength(24);
  });

  it("change place with the level, round after round", () => {
    expect([1, 2, 3, 4].map((level) => zoneFor("sea", level))).toEqual(["reef", "kelp", "trench", "reef"]);
  });
});

describe("the settings of a round", () => {
  it("start gentle and grow with the level: more groups, more kinds, faster, more thrown", () => {
    const first = settingsFor(PROGRESS.fresh(), "flick", "AAAAAAAA");
    const later = settingsFor({ ...PROGRESS.fresh(), level: 9 }, "flick", "AAAAAAAA");
    expect(first).toMatchObject({ level: 1, seconds: roundSeconds(1), boss: false });
    expect(Math.floor(first.tier)).toBe(2);
    for (const key of ["groups", "pace", "fire", "tier", "skill"]) expect(later[key], key).toBeGreaterThan(first[key]);
    expect(later.boss).toBe(true);
    expect(settingsFor({ ...PROGRESS.fresh(), level: 4 }, "flick", "AAAAAAAA").boss).toBe(false);
  });

  it("are the same on both phones with a friend, whatever each one's level, from the round's seed", () => {
    const one = settingsFor({ ...PROGRESS.fresh(), level: 1 }, "friend", "AAAAAAAA");
    const two = settingsFor({ ...PROGRESS.fresh(), level: 14 }, "friend", "AAAAAAAA");
    expect(one).toEqual(two);
    expect(one.level).toBeGreaterThanOrEqual(3);
    expect(one.level).toBeLessThanOrEqual(6);
    const levels = new Set(["AAAAAAAA", "AAAAAAAB", "AAAAAAAC", "AAAAAAAD"].map((seed) => settingsFor(PROGRESS.fresh(), "friend", seed).level));
    expect(levels.size).toBeGreaterThan(1);
  });

  it("count a round as won when the wave is cleared or the team popped most of what it held", () => {
    expect(wonRound({ cleared: true, score: 3, worth: 100 })).toBe(true);
    expect(wonRound({ cleared: false, score: 60, worth: 100 })).toBe(true);
    expect(wonRound({ cleared: false, score: 59, worth: 100 })).toBe(false);
    expect(wonRound({ cleared: false, score: PROGRESS.spec.stars.two - 1, worth: 10 })).toBe(false);
  });
});
