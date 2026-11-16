// @vitest-environment node
import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { VARIANTS } from "../src/arena.js";
import { FLICK_RING, LOOKS, PLACES, PROGRESS, RINGS, ringFor, settingsFor, variantFor, wonRound } from "../src/levels.js";

describe("levels, stars and gifts", () => {
  it("offers two places and two rings from the start, and wraps the cloud and two rings as gifts", () => {
    expect(PLACES).toEqual(["pond", "pool", "cloud"]);
    expect(RINGS).toEqual(["coral", "aqua", "lilac", "sunny"]);
    expect(LOOKS).toEqual({ place: PLACES, ring: RINGS });
    const fresh = PROGRESS.fresh();
    expect(PROGRESS.owned(fresh).sort()).toEqual(["aqua", "coral", "pond", "pool"]);
    expect(fresh.chosen).toEqual({ place: "pond", ring: "coral" });
    expect(PROGRESS.schedule.map(({ look }) => look)).toEqual(["lilac", "cloud", "sunny"]);
  });

  it("gives Flick its own ring, and another one when the player wears it", () => {
    expect(ringFor("coral")).toBe(FLICK_RING);
    expect(ringFor(FLICK_RING)).not.toBe(FLICK_RING);
    expect(RINGS).toContain(ringFor(FLICK_RING));
  });

  it("starts on the plain platform against a Flick that is learning, and brings a new platform and more skill with the levels", () => {
    const first = settingsFor(PROGRESS.fresh(), "flick", "seed0001");
    expect(first).toMatchObject({ level: 1, eased: false, seconds: 35, variant: "plain" });
    expect(first.skill).toBeLessThan(0.4);
    const later = settingsFor({ ...PROGRESS.fresh(), level: 9 }, "flick", "seed0001");
    expect(later.skill).toBeGreaterThan(first.skill);
    expect(later.seconds).toBe(roundSeconds(9));
    const eased = settingsFor({ ...PROGRESS.fresh(), level: 9, losses: 2 }, "flick", "seed0001");
    expect(eased.eased).toBe(true);
    expect(eased.skill).toBeLessThan(later.skill);
  });

  it("picks the platform from the round's seed among the ones the level has reached", () => {
    expect(variantFor("any", 0)).toBe("plain");
    const seen = new Set();
    for (let at = 0; at < 60; at += 1) {
      const low = variantFor(`seed-${at}`, 1);
      expect(["plain", "shrink"]).toContain(low);
      expect(variantFor(`seed-${at}`, 4)).toBe(variantFor(`seed-${at}`, 4));
      seen.add(variantFor(`seed-${at}`, 4));
    }
    expect([...seen].sort()).toEqual([...VARIANTS].sort());
  });

  it("plays a round with a person at the same settings on both phones, whatever their levels", () => {
    const one = settingsFor({ ...PROGRESS.fresh(), level: 2 }, "friend", "shared01");
    const two = settingsFor({ ...PROGRESS.fresh(), level: 14, losses: 2 }, "friend", "shared01");
    expect(one).toEqual(two);
    expect(one.seconds).toBeGreaterThanOrEqual(35);
    expect(one.seconds).toBeLessThanOrEqual(90);
    expect(settingsFor(PROGRESS.fresh(), "pair", "shared01")).toEqual(one);
  });

  it("counts a round as won when the player made more points, and gives stars for the player's points", () => {
    expect(wonRound(3, 2)).toBe(true);
    expect(wonRound(2, 2)).toBe(false);
    expect(wonRound(1, 3)).toBe(false);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 3 }).stars).toBe(3);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 2 }).stars).toBe(2);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 0 }).stars).toBe(1);
  });
});
