import { describe, expect, it } from "vitest";
import { REACH } from "../src/kicks.js";
import { BALLS, FIELDS, LOOKS, PROGRESS, settingsFor, wonRound } from "../src/levels.js";

describe("the levels", () => {
  it("start with a keeper who lets a lot through and a long warning, and grow harder up to a ceiling", () => {
    const first = settingsFor(PROGRESS.fresh(), "flick");
    expect(first).toMatchObject({ level: 1, eased: false });
    const top = settingsFor({ ...PROGRESS.fresh(), level: 30 }, "flick");
    expect(top.skill).toBeGreaterThan(first.skill);
    expect(top.skill).toBeLessThanOrEqual(0.85);
    expect(top.warn).toBeLessThan(first.warn);
    expect(top.warn).toBeGreaterThanOrEqual(300);
    expect(top.reach).toBeLessThan(first.reach);
    expect(top.reach).toBeGreaterThanOrEqual(0.3);
    expect(PROGRESS.plateau).toBeLessThanOrEqual(8);
  });

  it("ease off after two lost rounds in a row and let the player through after a third", () => {
    let record = PROGRESS.fresh();
    record = PROGRESS.awardRound(record, { won: true, score: 6 }).record;
    const usual = settingsFor(record, "flick");
    record = PROGRESS.awardRound(record, { won: false, score: 1 }).record;
    record = PROGRESS.awardRound(record, { won: false, score: 1 }).record;
    const eased = settingsFor(record, "flick");
    expect(eased.eased).toBe(true);
    expect(eased.skill).toBeLessThan(usual.skill);
    expect(eased.warn).toBeGreaterThan(usual.warn);
    expect(eased.reach).toBeGreaterThan(usual.reach);
    const third = PROGRESS.awardRound(record, { won: false, score: 1 });
    expect(third.passed).toBe(true);
    expect(third.record.level).toBe(3);
  });

  it("are the same for both players when two people play, whatever their level", () => {
    const far = { ...PROGRESS.fresh(), level: 9 };
    expect(settingsFor(far, "friend")).toEqual(settingsFor(PROGRESS.fresh(), "friend"));
    expect(settingsFor(far, "pair")).toEqual(settingsFor(PROGRESS.fresh(), "pair"));
    expect(settingsFor(far, "friend").reach).toBe(REACH.blind);
    expect(settingsFor(far, "pair").reach).toBe(REACH.pair);
  });

  it("give stars for goals, saves and bonus targets together", () => {
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: false, score: 2 }).stars).toBe(1);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 5 }).stars).toBe(2);
    expect(PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 8 }).stars).toBe(3);
  });

  it("hand out balls and fields as gifts, looks only, one of each kind owned from the start", () => {
    expect(LOOKS).toEqual({ ball: BALLS, field: FIELDS });
    expect(BALLS).toEqual(["classic", "beachball", "star"]);
    expect(FIELDS).toEqual(["school", "beach", "stadium"]);
    const fresh = PROGRESS.fresh();
    expect(PROGRESS.owned(fresh).sort()).toEqual(["beachball", "classic", "school"]);
    expect(fresh.chosen).toEqual({ ball: "classic", field: "school" });
    expect(PROGRESS.schedule.map((gift) => gift.look)).toEqual(["beach", "star", "stadium"]);
  });

  it("call a round won when the player scored at least as many as the other side", () => {
    expect(wonRound(3, 2)).toBe(true);
    expect(wonRound(2, 2)).toBe(true);
    expect(wonRound(1, 2)).toBe(false);
  });
});
