import { describe, expect, it } from "vitest";
import { BALLS } from "../src/effects.js";
import { LOOKS, PROGRESS, roundSetup, wonRound } from "../src/levels.js";
import { SHIPS } from "../src/ships.js";
import { SUBS } from "../src/subs.js";
import { TANKS } from "../src/tanks.js";

describe("levels and gifts", () => {
  it("give looks of four kinds, the drawn vehicles and paint balls, and nothing that plays differently", () => {
    expect(LOOKS.tank).toEqual(TANKS.map((one) => one.id));
    expect(LOOKS.ship).toEqual(SHIPS.map((one) => one.id));
    expect(LOOKS.sub).toEqual(SUBS.map((one) => one.id));
    expect(LOOKS.ball).toEqual(BALLS);
    const owned = PROGRESS.owned(PROGRESS.fresh());
    expect(owned).not.toContain("snail");
    expect(owned).not.toContain("rainbow");
    expect(PROGRESS.schedule.map((one) => one.look).sort()).toEqual(["bathtub", "longfin", "rainbow", "snail", "submarine", "wooden"]);
    expect(PROGRESS.fresh().chosen).toEqual({ tank: "round", ship: "tug", sub: "classic", ball: "normal" });
  });

  it("make Flick aim better and the wind blow harder level after level, and ease off after two lost rounds", () => {
    let record = PROGRESS.fresh();
    const first = roundSetup(record);
    for (let won = 0; won < 8; won += 1) record = PROGRESS.awardRound(record, { won: true, score: 5 }).record;
    const later = roundSetup(record);
    expect(later.skill).toBeGreaterThan(first.skill);
    expect(later.wind).toBeGreaterThan(first.wind);
    expect(Number.isInteger(later.wind)).toBe(true);
    for (let lost = 0; lost < 2; lost += 1) record = PROGRESS.awardRound(record, { won: false, score: 0 }).record;
    const eased = roundSetup(record);
    expect(eased.eased).toBe(true);
    expect(eased.skill).toBeLessThan(later.skill);
    expect(eased.wind).toBeLessThan(later.wind);
    expect(eased.wind).toBeGreaterThanOrEqual(0);
  });

  it("count a battle won or even as won, and target practice as won from two stars", () => {
    expect(wonRound({ practice: false, winner: 0, mySide: 0 })).toBe(true);
    expect(wonRound({ practice: false, winner: null, mySide: 1 })).toBe(true);
    expect(wonRound({ practice: false, winner: 1, mySide: 0 })).toBe(false);
    expect(wonRound({ practice: true, score: 2 })).toBe(false);
    expect(wonRound({ practice: true, score: 3 })).toBe(true);
  });
});
