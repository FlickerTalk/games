// @vitest-environment node
import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { FLICK_PADDLE, LOOKS, PADDLES, PROGRESS, TABLES, settingsFor, wonRound } from "../src/levels.js";

describe("levels, stars and gifts", () => {
  it("offers four paddles and the three tables from the start, and two paddles as wrapped gifts", () => {
    expect(PADDLES).toEqual(["cat", "log", "dog", "rocket", "caterpillar", "cloud"]);
    expect(TABLES).toEqual(["pond", "ice", "space"]);
    expect(LOOKS).toEqual({ paddle: PADDLES, table: TABLES });
    const fresh = PROGRESS.fresh();
    expect(PROGRESS.owned(fresh).sort()).toEqual(["cat", "dog", "ice", "log", "pond", "rocket", "space"]);
    expect(fresh.chosen).toEqual({ paddle: "cat", table: "pond" });
    expect(PROGRESS.schedule.map(({ look }) => look)).toEqual(["caterpillar", "cloud"]);
    expect(FLICK_PADDLE).toBe("rocket");
  });

  it("gives a round against FlickerTalk its level's speed, skill and length, eased after two losses", () => {
    const first = settingsFor(PROGRESS.fresh(), "flick");
    expect(first).toMatchObject({ level: 1, eased: false, seconds: 35 });
    expect(first.speed).toBeGreaterThan(0.5);
    expect(first.skill).toBeGreaterThan(0.3);
    const later = settingsFor({ ...PROGRESS.fresh(), level: 9 }, "flick");
    expect(later.speed).toBeGreaterThan(first.speed);
    expect(later.skill).toBeGreaterThan(first.skill);
    expect(later.seconds).toBe(roundSeconds(9));
    const eased = settingsFor({ ...PROGRESS.fresh(), level: 9, losses: 2 }, "flick");
    expect(eased.eased).toBe(true);
    expect(eased.speed).toBeLessThan(later.speed);
    expect(eased.skill).toBeLessThan(later.skill);
    expect(eased.seconds).toBeLessThanOrEqual(later.seconds);
  });

  it("plays a round with a person at the same settings on both phones, whatever their levels", () => {
    const one = settingsFor({ ...PROGRESS.fresh(), level: 2 }, "friend");
    const two = settingsFor({ ...PROGRESS.fresh(), level: 14, losses: 2 }, "friend");
    expect(one).toEqual(two);
    expect(one.seconds).toBeGreaterThanOrEqual(35);
    expect(one.seconds).toBeLessThanOrEqual(90);
    expect(settingsFor(PROGRESS.fresh(), "pair")).toEqual(one);
  });

  it("counts a round as won when the player scored at least as much, and gives stars for the player's goals", () => {
    expect(wonRound(3, 2)).toBe(true);
    expect(wonRound(2, 2)).toBe(true);
    expect(wonRound(1, 5)).toBe(false);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 5 }).stars).toBe(3);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 3 }).stars).toBe(2);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 0 }).stars).toBe(1);
  });
});
