import { describe, expect, it } from "vitest";
import { LOOKS, PROGRESS, flickSkill, scoreOf } from "../src/levels.js";
import { FINISH, startRace } from "../src/rules.js";

describe("levels, stars and gifts", () => {
  it("make Flick choose a little better each level, never perfectly, and ease off after two losses", () => {
    const first = flickSkill(PROGRESS.fresh());
    expect(first).toBeGreaterThanOrEqual(0.5);
    expect(first).toBeLessThan(0.7);
    const later = flickSkill({ ...PROGRESS.fresh(), level: 30 });
    expect(later).toBeGreaterThan(first);
    expect(later).toBeLessThan(1);
    expect(flickSkill({ ...PROGRESS.fresh(), level: 30, losses: 2 })).toBeLessThan(later);
  });

  it("have no timer: a round is a race of turns, as long as the dice make it", () => {
    expect(PROGRESS.spec.timed).toBe(false);
    expect(PROGRESS.nextRound(PROGRESS.fresh()).seconds).toBeUndefined();
  });

  it("score a round by the square reached, and a win by how far ahead it was", () => {
    const race = { ...startRace(), at: [FINISH, 12], winner: 0 };
    expect(scoreOf(race, 0)).toBe(FINISH + 18);
    expect(scoreOf(race, 1)).toBe(12);
    expect(scoreOf({ ...startRace(), at: [7, 9] }, 0)).toBe(7);
  });

  it("give one star for a round lost, two for one won and three for one won well ahead", () => {
    const award = (score, won) => PROGRESS.awardRound(PROGRESS.fresh(), { won, score }).stars;
    expect(award(22, false)).toBe(1);
    expect(award(FINISH + 3, true)).toBe(2);
    expect(award(FINISH + 12, true)).toBe(3);
  });

  it("hand out looks only: tracks and dice, with one of each from the start", () => {
    expect(LOOKS).toEqual({ track: ["garden", "city", "moon"], dice: ["cream", "sky", "mint", "rose"] });
    const owned = PROGRESS.owned(PROGRESS.fresh());
    expect(owned).toContain("garden");
    expect(owned).toContain("cream");
    expect(owned.length).toBeLessThan(LOOKS.track.length + LOOKS.dice.length);
    expect(PROGRESS.fresh().chosen).toEqual({ track: "garden", dice: "cream" });
  });
});
