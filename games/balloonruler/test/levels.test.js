import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { LOOKS, PROGRESS, RULERS, readRuler, roundSetup, stageFor, wonRound } from "../src/levels.js";
import { STAGES } from "../src/numbers.js";

const atLevel = (level, losses = 0) => ({ ...PROGRESS.fresh(), level, losses });

describe("the levels", () => {
  it("start on the short ruler with dots, three balloons far apart and the first level's 35 seconds", () => {
    const setup = roundSetup(PROGRESS.fresh(), "short");
    expect(setup).toMatchObject({ level: 1, stage: 0, count: 3, seconds: 35, ticks: false });
    expect(setup.spread).toBeCloseTo(0.3);
    expect(setup.error).toBeCloseTo(0.3);
  });

  it("move to digits and a longer ruler as the levels grow, with more balloons closer together and a sharper Flick", () => {
    expect(stageFor("short", 1)).toBe(0);
    expect(stageFor("short", 3)).toBe(1);
    expect(stageFor("short", 5)).toBe(2);
    expect(stageFor("short", 40)).toBe(2);
    const late = roundSetup(atLevel(30), "short");
    expect(late.count).toBe(5);
    expect(late.spread).toBeCloseTo(0.12);
    expect(late.error).toBeCloseTo(0.14);
    expect(late.seconds).toBe(roundSeconds(30));
    expect(late.seconds).toBeLessThanOrEqual(90);
  });

  it("lets the player pick a longer ruler: tens and hundreds, then fractions and thousands", () => {
    expect(RULERS).toEqual(["short", "medium", "long"]);
    expect(STAGES[stageFor("medium", 1)]).toMatchObject({ range: 100, step: 10 });
    expect(STAGES[stageFor("medium", 9)]).toMatchObject({ range: 100, step: 1 });
    expect(STAGES[stageFor("long", 1)].card).toBe("fraction");
    expect(STAGES[stageFor("long", 9)].range).toBe(1000);
    expect(readRuler("long")).toBe("long");
    expect(readRuler("huge")).toBe("short");
  });

  it("eases off after two lost rounds: fewer balloons further apart, the marks on the ruler, a kinder Flick", () => {
    const usual = roundSetup(atLevel(6), "short");
    const eased = roundSetup(atLevel(6, 2), "short");
    expect(eased.ticks).toBe(true);
    expect(eased.count).toBeLessThan(usual.count);
    expect(eased.count).toBeGreaterThanOrEqual(2);
    expect(eased.spread).toBeGreaterThan(usual.spread);
    expect(eased.error).toBeGreaterThan(usual.error);
  });

  it("counts a round with two stars as won, and lets the player through after three lost", () => {
    expect(wonRound(1)).toBe(false);
    expect(wonRound(2)).toBe(true);
    let record = PROGRESS.fresh();
    for (let lost = 0; lost < 3; lost += 1) record = PROGRESS.awardRound(record, { won: false, score: 3 }).record;
    expect(record.level).toBe(2);
  });

  it("gives arrow tips and places as gifts, one of each from the start, never an advantage", () => {
    expect(LOOKS).toEqual({ tip: ["suction", "cork", "flower"], place: ["meadow", "mountain", "clouds"] });
    expect(PROGRESS.owned(PROGRESS.fresh()).sort()).toEqual(["meadow", "suction"]);
    expect(PROGRESS.fresh().chosen).toEqual({ tip: "suction", place: "meadow" });
  });
});
