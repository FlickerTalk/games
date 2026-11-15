import { describe, expect, it } from "vitest";
import { defineProgress } from "../../src/progress/index.js";
import { readRecord } from "../../src/progress/record.js";

const court = defineProgress({
  stars: { two: 100, three: 200 },
  tracks: { small: { two: 30, three: 60 }, daily: { two: 100, three: 200 } },
});

describe("a game played on several tracks", () => {
  it("starts with no best mark on any track", () => {
    expect(court.fresh()).toMatchObject({ best: null, bests: {} });
  });

  it("gives each track its own stars and best mark, and leaves the main best alone", () => {
    const small = court.awardRound(court.fresh(), { won: true, score: 45, track: "small" });
    expect(small).toMatchObject({ stars: 2, newBest: true });
    expect(small.record).toMatchObject({ best: null, bests: { small: 45 } });
    const lower = court.awardRound(small.record, { won: true, score: 40, track: "small" });
    expect(lower).toMatchObject({ stars: 2, newBest: false });
    expect(lower.record.bests).toEqual({ small: 45 });
    const main = court.awardRound(lower.record, { won: true, score: 150 });
    expect(main).toMatchObject({ stars: 2, newBest: true });
    expect(main.record).toMatchObject({ best: 150, bests: { small: 45 } });
    const daily = court.awardRound(main.record, { won: false, score: 90, track: "daily" });
    expect(daily).toMatchObject({ stars: 1, newBest: true });
    expect(daily.record.bests).toEqual({ small: 45, daily: 90 });
  });

  it("counts a round on any track towards levels and gifts like any other", () => {
    const outcome = court.awardRound(court.fresh(), { won: true, score: 10, track: "small" });
    expect(outcome.record).toMatchObject({ level: 2, wins: 1 });
  });

  it("refuses a track the game did not declare, and a round on a track without a score", () => {
    expect(() => court.awardRound(court.fresh(), { won: true, score: 10, track: "big" })).toThrow('"big"');
    expect(() => court.awardRound(court.fresh(), { won: true, track: "small" })).toThrow("score");
    const plain = defineProgress({});
    expect(() => plain.awardRound(plain.fresh(), { won: true, score: 1, track: "small" })).toThrow('"small"');
  });

  it("reads back only the declared tracks' marks that are numbers", () => {
    const raw = { v: 1, bests: { small: 12, daily: "9", big: 40 } };
    expect(readRecord(court.spec, raw).bests).toEqual({ small: 12 });
    expect(readRecord(court.spec, { v: 1, bests: [3] }).bests).toEqual({});
  });

  it("keeps the record of a game without tracks exactly as before", () => {
    expect("bests" in defineProgress({}).fresh()).toBe(false);
  });

  it("is checked when the game is defined", () => {
    expect(() => defineProgress({ tracks: [] })).toThrow("tracks");
    expect(() => defineProgress({ tracks: { small: { two: 5, three: 2 } } })).toThrow("higher score");
    expect(() => defineProgress({ tracks: { "": { two: 1, three: 2 } } })).toThrow("tracks");
  });
});
