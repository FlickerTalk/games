import { describe, expect, it } from "vitest";
import { generateTrain } from "../src/generate.js";
import { PROGRESS, TRAINS, pointsFor, roundSetup, wonRound } from "../src/levels.js";
import { beatsOf, checkTrain, gapsOf, kindOf, periodOf } from "../src/train.js";

const EASY = { length: 4, unit: 2, gaps: 1, kinds: 3, beats: 0, choices: 3 };
const HARD = { length: 7, unit: 3, gaps: 2, kinds: 8, beats: 1, choices: 4 };
const seeds = Array.from({ length: 60 }, (_, at) => `seed-${at}`);

describe("a train made by the phone", () => {
  it("always follows a pattern and has exactly one right answer", () => {
    for (const values of [EASY, HARD, { ...HARD, length: 5.8, unit: 2.7 }]) {
      for (const seed of seeds) expect(checkTrain(generateTrain(seed, values)), `${seed} ${JSON.stringify(values)}`).toBeNull();
    }
  });

  it("is the same train for the same seed", () => {
    expect(generateTrain("same", HARD)).toEqual(generateTrain("same", HARD));
    expect(new Set(seeds.map((seed) => JSON.stringify(generateTrain(seed, HARD)))).size).toBeGreaterThan(20);
  });

  it("starts with four wagons of two alternating instruments, one missing and no beats to count", () => {
    for (const seed of seeds) {
      const train = generateTrain(seed, EASY);
      expect(train.wagons).toHaveLength(4);
      expect(periodOf(train.wagons)).toBe(2);
      expect(gapsOf(train)).toHaveLength(1);
      expect(train.wagons.every((wagon) => beatsOf(wagon) === 1 && kindOf(wagon) < 3)).toBe(true);
    }
  });

  it("grows to seven wagons, units of three, two gaps and beats to count", () => {
    const trains = seeds.map((seed) => generateTrain(seed, HARD));
    expect(trains.every((train) => train.wagons.length === 7 && gapsOf(train).length === 2)).toBe(true);
    expect(trains.some((train) => periodOf(train.wagons) === 3)).toBe(true);
    expect(trains.some((train) => train.wagons.some((wagon) => beatsOf(wagon) > 1))).toBe(true);
    expect(new Set(trains.flatMap((train) => train.wagons.map(kindOf))).size).toBe(8);
  });
});

describe("the levels", () => {
  it("grow gently from four wagons to seven and stop growing", () => {
    const first = roundSetup(PROGRESS.fresh());
    expect(first).toMatchObject({ level: 1, values: { length: 4, unit: 2, gaps: 1, choices: 3 } });
    const late = roundSetup({ ...PROGRESS.fresh(), level: PROGRESS.plateau });
    expect(late.values).toMatchObject({ length: 7, unit: 3, gaps: 2, kinds: 8, beats: 1, choices: 4 });
    expect(PROGRESS.plateau).toBeLessThanOrEqual(24);
    expect(PROGRESS.spec.timed).toBe(false);
  });

  it("give a round of three trains three stars without a wrong wagon, two with one or two, and never fewer than one", () => {
    expect(TRAINS).toBe(3);
    const stars = (wrongs) => PROGRESS.awardRound(PROGRESS.fresh(), { won: wonRound(wrongs), score: pointsFor(wrongs) }).stars;
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
  });

  it("count a round as lost only after many wrong wagons, ease off after two and let the player through after three", () => {
    expect([wonRound(4), wonRound(5)]).toEqual([true, false]);
    let record = PROGRESS.fresh();
    for (let round = 0; round < 2; round += 1) record = PROGRESS.awardRound(record, { won: false, score: 10 }).record;
    expect(PROGRESS.nextRound(record).eased).toBe(true);
    expect(PROGRESS.awardRound(record, { won: false, score: 10 }).passed).toBe(true);
  });

  it("hand out two engines and two stations as gifts, looks only", () => {
    expect(PROGRESS.owned(PROGRESS.fresh())).toEqual(["steam", "valley", "rocket", "caterpillar", "teapot"]);
    expect(PROGRESS.spec.gifts.looks.slice(5)).toEqual(["desert", "whale", "night", "dragon"]);
  });
});
