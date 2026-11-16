import { describe, expect, it } from "vitest";
import { starsFor } from "../../../kit/src/progress/index.js";
import { LOOKS, PROGRESS, TIMES, dayOf, roundSetup, thresholdsFor, trackOf, wonRound } from "../src/levels.js";

const after = (scores) => scores.reduce((record, score) => PROGRESS.awardRound(record, { won: wonRound(starsFor(score, thresholdsFor("alone"))), score }).record, PROGRESS.fresh());

describe("the levels", () => {
  it("start with a 35 second round and calm fish, and grow longer and a little livelier, never past 90 seconds", () => {
    const first = roundSetup(PROGRESS.fresh(), "alone");
    expect(first).toMatchObject({ level: 1, seconds: 35, anglers: 1, eased: false });
    expect(first.pace).toBeCloseTo(0.08);
    let record = PROGRESS.fresh();
    let last = first;
    for (let level = 2; level <= 30; level += 1) {
      record = PROGRESS.awardRound(record, { won: true, score: 20 }).record;
      const next = roundSetup(record, "alone");
      expect(next.seconds).toBeGreaterThanOrEqual(35);
      expect(next.seconds).toBeLessThanOrEqual(90);
      expect(next.pace).toBeGreaterThanOrEqual(last.pace);
      last = next;
    }
    expect(last.pace).toBeCloseTo(0.12);
  });

  it("put Flick on the pier against FlickerTalk only, resting a little longer between catches as the levels go up", () => {
    expect(roundSetup(PROGRESS.fresh(), "flick").anglers).toBe(2);
    expect(roundSetup(PROGRESS.fresh(), "friend").anglers).toBe(1);
    const later = PROGRESS.read({ v: 1, level: 8, losses: 0, wins: 7, best: null, received: [], chosen: { charm: "star", place: "pier" } });
    expect(roundSetup(later, "flick").rest).toBeGreaterThan(roundSetup(PROGRESS.fresh(), "flick").rest);
  });

  it("ease off after two rounds under two stars: slower fish, a shorter round and Flick helping more", () => {
    const record = PROGRESS.read({ v: 1, level: 6, losses: 2, wins: 5, best: 4, received: [], chosen: { charm: "star", place: "pier" } });
    const eased = roundSetup(record, "flick");
    const plain = roundSetup({ ...record, losses: 0 }, "flick");
    expect(eased.eased).toBe(true);
    expect(eased.pace).toBeLessThan(plain.pace);
    expect(eased.rest).toBeLessThan(plain.rest);
    expect(eased.seconds).toBeLessThanOrEqual(plain.seconds);
  });

  it("let the player through after three rounds under two stars: no round is ever failed", () => {
    expect(after([1, 1, 1]).level).toBe(2);
    expect(after([1, 1]).level).toBe(1);
    expect(after([5]).level).toBe(2);
  });

  it("give stars for the catch, more needed when Flick fishes too, and keep each best apart", () => {
    expect(thresholdsFor("alone")).toEqual({ two: 5, three: 9 });
    expect(thresholdsFor("friend")).toEqual({ two: 5, three: 9 });
    expect(thresholdsFor("flick")).toEqual({ two: 8, three: 13 });
    const solo = PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 9 });
    expect(solo.stars).toBe(3);
    const pair = PROGRESS.awardRound(solo.record, { won: true, score: 9, track: trackOf("flick") });
    expect(pair.stars).toBe(2);
    expect(pair.record.best).toBe(9);
    expect(pair.record.bests).toEqual({ pair: 9 });
    expect(wonRound(1)).toBe(false);
    expect(wonRound(2)).toBe(true);
  });

  it("give looks only as gifts: hook charms and fishing spots, the star charm and the pier from the start", () => {
    expect(LOOKS).toEqual({ charm: ["star", "heart", "flower"], place: ["pier", "boat"] });
    expect(PROGRESS.owned(PROGRESS.fresh())).toEqual(["star", "pier"]);
    expect(PROGRESS.fresh().chosen).toEqual({ charm: "star", place: "pier" });
    expect(PROGRESS.schedule.map(({ look, at }) => [look, at])).toEqual([["heart", 2], ["boat", 5], ["flower", 9]]);
  });

  it("move through the times of day, one each round", () => {
    expect(TIMES).toEqual(["morning", "sunset", "night"]);
    expect([0, 1, 2, 3, 4].map(dayOf)).toEqual(["morning", "sunset", "night", "morning", "sunset"]);
    expect(dayOf(-1)).toBe("morning");
    expect(dayOf(Number.NaN)).toBe("morning");
  });
});
