import { describe, expect, it } from "vitest";
import { STANDARD_MIX, mixFor } from "../src/trays.js";
import { LOOKS, PROGRESS, roundSetup, thresholdsFor, trackOf, wonRound } from "../src/levels.js";

describe("levels, stars and gifts", () => {
  it("gives the line effects and the courtyards as gifts, a few from the start, the rest in a fixed order", () => {
    expect(LOOKS.effect).toEqual(["lanterns", "birds", "leaves", "bubbles", "water", "sparks"]);
    expect(LOOKS.court).toEqual(["patio", "rooftop", "greenhouse", "seaside", "night"]);
    expect(PROGRESS.owned(PROGRESS.fresh())).toEqual(["lanterns", "patio", "birds"]);
    expect(PROGRESS.fresh().chosen).toEqual({ effect: "lanterns", court: "patio" });
    expect(PROGRESS.schedule.map(({ at }) => at)).toEqual([2, 5, 9, 11, 14, 18, 20, 23]);
    expect(PROGRESS.schedule).toHaveLength(8);
  });

  it("gives each court its own stars and best mark, the court of the day among them", () => {
    expect(thresholdsFor("main")).toEqual({ two: 180, three: 240 });
    expect(thresholdsFor("small").three).toBeLessThan(thresholdsFor("main").three);
    expect(thresholdsFor("big")).toBeDefined();
    expect(thresholdsFor("daily")).toEqual(thresholdsFor("main"));
    expect(trackOf("main")).toBeUndefined();
    expect(trackOf("small")).toBe("small");
  });

  it("deals fewer large pieces on the first levels and after two rounds lost, and the same trays on both phones", () => {
    const first = roundSetup(PROGRESS.fresh(), { variant: "main", mode: "alone" });
    const later = roundSetup({ ...PROGRESS.fresh(), level: 9 }, { variant: "main", mode: "alone" });
    const eased = roundSetup({ ...PROGRESS.fresh(), level: 9, losses: 2 }, { variant: "main", mode: "alone" });
    expect(first.mix[3]).toBeLessThan(later.mix[3]);
    expect(eased.mix[3]).toBeLessThan(later.mix[3]);
    expect(roundSetup({ ...PROGRESS.fresh(), level: 9 }, { variant: "main", mode: "friend" }).mix).toEqual(STANDARD_MIX);
    expect(roundSetup({ ...PROGRESS.fresh(), level: 9 }, { variant: "daily", mode: "alone" }).mix).toEqual(STANDARD_MIX);
    expect(later.mix).toEqual(mixFor(1.2));
  });

  it("lets Flick play better level by level, and ease off after the player loses twice", () => {
    const skill = (record) => roundSetup(record, { variant: "main", mode: "flick" }).skill;
    expect(skill(PROGRESS.fresh())).toBeLessThan(skill({ ...PROGRESS.fresh(), level: 6 }));
    expect(skill({ ...PROGRESS.fresh(), level: 6, losses: 2 })).toBeLessThan(skill({ ...PROGRESS.fresh(), level: 6 }));
    expect(skill({ ...PROGRESS.fresh(), level: 60 })).toBeLessThanOrEqual(0.8);
  });

  it("counts a round won when every tray was laid, or against Flick when the score is at least Flick's", () => {
    expect(wonRound({ mode: "alone", mine: { score: 90, done: true } })).toBe(true);
    expect(wonRound({ mode: "alone", mine: { score: 290, done: false } })).toBe(false);
    expect(wonRound({ mode: "friend", mine: { score: 90, done: true } })).toBe(true);
    expect(wonRound({ mode: "flick", mine: { score: 120, done: false }, rival: { score: 120 } })).toBe(true);
    expect(wonRound({ mode: "flick", mine: { score: 119, done: true }, rival: { score: 120 } })).toBe(false);
  });
});
