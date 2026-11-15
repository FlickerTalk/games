import { describe, expect, it } from "vitest";
import { checkCurve } from "../../src/progress/curve.js";
import { checkGifts } from "../../src/progress/gifts.js";
import { freshRecord } from "../../src/progress/record.js";
import { awardRound, nextRound } from "../../src/progress/round.js";
import { checkStars } from "../../src/progress/stars.js";

const curve = checkCurve({
  balloons: { first: 3, step: 1, limit: 8 },
  drift: { first: 1, step: 0.1, limit: 1.4, eased: -0.3 },
});
const timed = { curve, timed: true, stars: checkStars({ two: 20, three: 35 }), gifts: checkGifts({ looks: ["red", "blue", "kite", "comet", "moon"], free: 2 }) };
const plain = { curve: checkCurve({}), timed: false, stars: null, gifts: null };

const at = (spec, level, losses = 0) => ({ ...freshRecord(spec), level, losses });

function play(spec, record, results) {
  let now = record;
  const outcomes = [];
  for (const result of results) {
    const outcome = awardRound(spec, now, result);
    outcomes.push(outcome);
    now = outcome.record;
  }
  return { record: now, outcomes };
}

describe("the next round", () => {
  it("is level one at first, not eased, with the curve's first values and the first length", () => {
    expect(nextRound(timed, freshRecord(timed))).toEqual({ level: 1, eased: false, values: { balloons: 3, drift: 1 }, seconds: 35, halfway: false });
  });

  it("has no length for a game whose rounds are not timed", () => {
    expect(nextRound(plain, at(plain, 9))).toEqual({ level: 9, eased: false, values: {} });
  });

  it("is eased after two losses in a row: the eased values and the length of the level before, never longer", () => {
    const round = nextRound(timed, at(timed, 8, 2));
    expect(round).toMatchObject({ level: 8, eased: true, seconds: 60, halfway: true });
    expect(round.values.balloons).toBe(8);
    expect(round.values.drift).toBeCloseTo(1.1, 10);
    expect(nextRound(timed, at(timed, 8, 1))).toMatchObject({ eased: false, seconds: 70 });
  });

  it("is read from a damaged record as a first round", () => {
    expect(nextRound(timed, "{broken")).toMatchObject({ level: 1, eased: false, seconds: 35 });
  });
});

describe("awarding a round", () => {
  it("moves a win to the next level and counts it", () => {
    const { record, levelUp, passed, eased } = awardRound(timed, at(timed, 4, 1), { won: true, score: 10 });
    expect(record).toMatchObject({ level: 5, losses: 0, wins: 1 });
    expect([levelUp, passed, eased]).toEqual([true, false, false]);
  });

  it("keeps the level after a loss, eases the next round after the second loss in a row, and ends the easing with a win", () => {
    const { record, outcomes } = play(timed, at(timed, 4), [{ won: false, score: 1 }, { won: false, score: 1 }]);
    expect(outcomes.map(({ eased, levelUp }) => [eased, levelUp])).toEqual([[false, false], [true, false]]);
    expect(record).toMatchObject({ level: 4, losses: 2, wins: 0 });
    const won = awardRound(timed, record, { won: true, score: 5 });
    expect(won.record).toMatchObject({ level: 5, losses: 0 });
    expect(won.eased).toBe(false);
  });

  it("lets the player through to the next level after three losses in a row, not eased, counted like a win", () => {
    const { record, outcomes } = play(timed, at(timed, 4), Array(3).fill({ won: false, score: 0 }));
    expect(outcomes.map(({ passed }) => passed)).toEqual([false, false, true]);
    expect(outcomes[2]).toMatchObject({ levelUp: true, eased: false });
    expect(record).toMatchObject({ level: 5, losses: 0, wins: 1 });
  });

  it("gives one to three stars from the score, and says when the score is the best so far", () => {
    const { record, outcomes } = play(timed, freshRecord(timed), [
      { won: false, score: 12 },
      { won: true, score: 25 },
      { won: true, score: 25 },
      { won: true, score: 40 },
      { won: false, score: 3 },
    ]);
    expect(outcomes.map(({ stars }) => stars)).toEqual([1, 2, 2, 3, 1]);
    expect(outcomes.map(({ newBest }) => newBest)).toEqual([true, true, false, true, false]);
    expect(record.best).toBe(40);
  });

  it("gives a game without stars no stars, and still keeps its best score", () => {
    const { record, outcomes } = play(plain, freshRecord(plain), [{ won: true, score: 4 }, { won: true }, { won: false, score: 9 }]);
    expect(outcomes.map(({ stars }) => stars)).toEqual([null, null, null]);
    expect(outcomes.map(({ newBest }) => newBest)).toEqual([true, false, true]);
    expect(record.best).toBe(9);
  });

  it("unwraps each gift once, on the declared win, and makes it the chosen look", () => {
    const { record, outcomes } = play(timed, freshRecord(timed), Array(12).fill({ won: true, score: 1 }));
    expect(outcomes.map(({ gift }) => gift)).toEqual([null, "kite", null, null, "comet", null, null, null, "moon", null, null, null]);
    expect(record).toMatchObject({ wins: 12, received: ["kite", "comet", "moon"], chosen: "moon" });
  });

  it("never gives a gift to a game that declares none", () => {
    const { record, outcomes } = play(plain, freshRecord(plain), Array(60).fill({ won: true }));
    expect(outcomes.every(({ gift }) => gift === null)).toBe(true);
    expect(record).toMatchObject({ level: 61, wins: 60, received: [], chosen: null });
  });

  it("gives no gift for a loss, even when one is due", () => {
    const record = { ...freshRecord(timed), wins: 5 };
    expect(awardRound(timed, record, { won: false, score: 1 }).gift).toBeNull();
    expect(awardRound(timed, record, { won: true, score: 1 }).gift).toBe("kite");
  });

  it("never changes the record it is given", () => {
    const record = Object.freeze({ ...at(timed, 3, 2), received: Object.freeze([]) });
    const copy = JSON.stringify(record);
    awardRound(timed, record, { won: false, score: 1 });
    awardRound(timed, record, { won: true, score: 99 });
    expect(JSON.stringify(record)).toBe(copy);
  });

  it("starts from a safe record when the one it is given is damaged", () => {
    expect(awardRound(timed, "{broken", { won: true, score: 1 }).record).toMatchObject({ level: 2, wins: 1 });
    expect(awardRound(timed, { v: 1, level: -4, losses: 7 }, { won: false, score: 1 }).record).toMatchObject({ level: 1, losses: 1 });
  });

  it("refuses a result that is not one, with a clear mistake", () => {
    expect(() => awardRound(timed, freshRecord(timed), null)).toThrow("won");
    expect(() => awardRound(timed, freshRecord(timed), { won: "yes", score: 1 })).toThrow("won");
    expect(() => awardRound(timed, freshRecord(timed), { won: true, score: Number.NaN })).toThrow("score");
    expect(() => awardRound(timed, freshRecord(timed), { won: true, score: "12" })).toThrow("score");
    expect(() => awardRound(timed, freshRecord(timed), { won: true })).toThrow("stars");
    expect(() => awardRound(plain, freshRecord(plain), { won: true })).not.toThrow();
  });
});
