// @vitest-environment node
import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { FLICK_ROBOT, LOOKS, PROGRESS, ROBOTS, SHOW_MS, STAGES, rivalRobot, settingsFor, wonRound } from "../src/levels.js";

describe("levels, stars and gifts", () => {
  it("offers four robots and the three stages from the start, and two robots as wrapped gifts", () => {
    expect(ROBOTS).toEqual(["round", "tall", "square", "wheel", "propeller", "bigHead"]);
    expect(STAGES).toEqual(["shelf", "kitchen", "box"]);
    expect(LOOKS).toEqual({ robot: ROBOTS, stage: STAGES });
    const fresh = PROGRESS.fresh();
    expect(PROGRESS.owned(fresh).sort()).toEqual(["box", "kitchen", "round", "shelf", "square", "tall", "wheel"]);
    expect(fresh.chosen).toEqual({ robot: "round", stage: "shelf" });
    expect(PROGRESS.schedule.map(({ look }) => look)).toEqual(["propeller", "bigHead"]);
  });

  it("gives Flick a robot of another shape than the player's", () => {
    expect(rivalRobot("round")).toBe(FLICK_ROBOT);
    expect(rivalRobot(FLICK_ROBOT)).not.toBe(FLICK_ROBOT);
    expect(ROBOTS).toContain(rivalRobot(FLICK_ROBOT));
  });

  it("gives a round against FlickerTalk its level's skill, window and length, in whole exchanges, eased after two losses", () => {
    const first = settingsFor(PROGRESS.fresh(), "flick");
    expect(first).toMatchObject({ level: 1, eased: false, seconds: 35 });
    expect(first.period).toBe(first.window + SHOW_MS);
    expect(first.exchanges).toBe(Math.floor(35_000 / first.period));
    const later = settingsFor({ ...PROGRESS.fresh(), level: 9 }, "flick");
    expect(later.skill).toBeGreaterThan(first.skill);
    expect(later.window).toBeLessThan(first.window);
    expect(later.seconds).toBe(roundSeconds(9));
    const eased = settingsFor({ ...PROGRESS.fresh(), level: 9, losses: 2 }, "flick");
    expect(eased.eased).toBe(true);
    expect(eased.skill).toBeLessThan(later.skill);
    expect(eased.window).toBeGreaterThan(later.window);
    expect(eased.seconds).toBeLessThanOrEqual(later.seconds);
  });

  it("keeps every round between 35 and 90 seconds with a window long enough to choose in", () => {
    for (let level = 1; level <= 30; level += 1) {
      const { seconds, window, exchanges, period } = settingsFor({ ...PROGRESS.fresh(), level }, "flick");
      expect(seconds, `level ${level}`).toBeGreaterThanOrEqual(35);
      expect(seconds, `level ${level}`).toBeLessThanOrEqual(90);
      expect(window, `level ${level}`).toBeGreaterThanOrEqual(1000);
      expect(exchanges * period, `level ${level}`).toBeLessThanOrEqual(seconds * 1000);
      expect(exchanges, `level ${level}`).toBeGreaterThanOrEqual(12);
    }
  });

  it("plays a round with a person at the same settings on both phones, whatever their levels", () => {
    const one = settingsFor({ ...PROGRESS.fresh(), level: 2 }, "friend");
    const two = settingsFor({ ...PROGRESS.fresh(), level: 14, losses: 2 }, "friend");
    expect(one).toEqual(two);
    expect(settingsFor(PROGRESS.fresh(), "pair")).toEqual(one);
  });

  it("counts a round as won when the player landed at least as many hits, and gives stars for toppling the other robot", () => {
    expect(wonRound(3, 2)).toBe(true);
    expect(wonRound(2, 2)).toBe(true);
    expect(wonRound(1, 5)).toBe(false);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 6 }).stars).toBe(3);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 3 }).stars).toBe(2);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 0 }).stars).toBe(1);
  });
});
