// @vitest-environment node
import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { FLICK_SWORD, LOOKS, PROGRESS, SCENERIES, SWORDS, VARIANTS, otherSword, settingsFor, wonRound } from "../src/levels.js";

describe("levels, stars and gifts", () => {
  it("offers four foam swords and the castle yard from the start, with two swords and two places as wrapped gifts", () => {
    expect(SWORDS).toEqual(["broad", "curved", "paddle", "block", "wavy", "long"]);
    expect(SCENERIES).toEqual(["castle", "pillows", "treehouse"]);
    expect(LOOKS).toEqual({ sword: SWORDS, scenery: SCENERIES });
    const fresh = PROGRESS.fresh();
    expect(PROGRESS.owned(fresh)).toEqual(["broad", "curved", "paddle", "block", "castle"]);
    expect(fresh.chosen).toEqual({ sword: "broad", scenery: "castle" });
    expect(PROGRESS.schedule.map(({ look }) => look)).toEqual(["pillows", "wavy", "treehouse", "long"]);
    expect(VARIANTS).toEqual(["flick", "pair"]);
  });

  it("gives a round its level's lures, Flick's reaction time and its length, eased after two losses", () => {
    const first = settingsFor(PROGRESS.fresh(), "flick");
    expect(first).toMatchObject({ level: 1, eased: false, seconds: 35, fakes: 0 });
    const later = settingsFor({ ...PROGRESS.fresh(), level: 9 }, "flick");
    expect(later.fakes).toBeGreaterThan(first.fakes);
    expect(later.react).toBeLessThan(first.react);
    expect(later.seconds).toBe(roundSeconds(9));
    const eased = settingsFor({ ...PROGRESS.fresh(), level: 9, losses: 2 }, "flick");
    expect(eased.eased).toBe(true);
    expect(eased.react).toBeGreaterThan(later.react);
    expect(eased.fakes).toBeLessThan(later.fakes);
    expect(settingsFor({ ...PROGRESS.fresh(), level: 40 }, "flick").react).toBeGreaterThanOrEqual(380);
  });

  it("plays a round between two people at the same settings on both phones, whatever their levels", () => {
    const one = settingsFor({ ...PROGRESS.fresh(), level: 2 }, "friend");
    const two = settingsFor({ ...PROGRESS.fresh(), level: 14, losses: 2 }, "friend");
    expect(one).toEqual(two);
    expect(settingsFor(PROGRESS.fresh(), "pair")).toEqual(one);
    expect(one.seconds).toBeGreaterThanOrEqual(35);
    expect(one.seconds).toBeLessThanOrEqual(90);
  });

  it("counts a round as won with at least the other's balloons and one of them popped", () => {
    expect(wonRound(4, 3)).toBe(true);
    expect(wonRound(3, 3)).toBe(true);
    expect(wonRound(2, 3)).toBe(false);
    expect(wonRound(0, 0)).toBe(false);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 7 }).stars).toBe(3);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 1 }).stars).toBe(1);
  });

  it("hands the other knight a sword of another shape than the player's", () => {
    expect(FLICK_SWORD).toBe("block");
    expect(otherSword("broad")).not.toBe("broad");
    expect(otherSword("block")).not.toBe("block");
    for (const sword of SWORDS) expect(SWORDS).toContain(otherSword(sword));
  });
});
