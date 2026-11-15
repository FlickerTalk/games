import { describe, expect, it } from "vitest";
import { defineProgress } from "../../src/progress/index.js";

const balloonPop = defineProgress({
  timed: true,
  curve: {
    balloons: { first: 4, step: 2, limit: 14 },
    rise: { first: 1, step: 0.25, limit: 2, eased: -0.5 },
  },
  stars: { two: 20, three: 35 },
  gifts: { looks: ["red", "yellow", "green", "kite", "parrot", "rocket", "comet", "moon", "rainbow"], free: 3 },
});

const RESULTS = "WWLWLLWLLL" + "WWWWLWWWWW" + "LLWWWWLLLW" + "WWWWWWLWWW" + "WWWLLWWWWW";

function memoryStore() {
  const kept = new Map();
  return { get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true) };
}

async function career() {
  const store = memoryStore();
  const rounds = [];
  for (const letter of RESULTS) {
    const record = await balloonPop.load(store);
    const round = balloonPop.nextRound(record);
    const outcome = balloonPop.awardRound(record, { won: letter === "W", score: letter === "W" ? 25 : 8 });
    expect(await balloonPop.save(store, outcome.record)).toBe(true);
    rounds.push({ ...outcome, ...round });
  }
  return { rounds, last: await balloonPop.load(store) };
}

describe("fifty rounds of an imaginary timed game", () => {
  it("climb the levels, one per win and one after three losses in a row", async () => {
    const { rounds, last } = await career();
    expect(rounds).toHaveLength(50);
    expect(rounds.map(({ level }) => level)).toEqual([
      1, 2, 3, 3, 4, 4, 4, 5, 5, 5,
      6, 7, 8, 9, 10, 10, 11, 12, 13, 14,
      15, 15, 15, 16, 17, 18, 19, 19, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 27, 28, 29,
      30, 31, 32, 33, 33, 33, 34, 35, 36, 37,
    ]);
    expect(rounds.flatMap(({ passed }, index) => (passed ? [index + 1] : []))).toEqual([10, 29]);
    expect(last).toMatchObject({ level: 38, losses: 0, wins: 37, best: 25 });
  });

  it("last as long as the table says, shorter only in the rounds after two losses in a row", async () => {
    const { rounds } = await career();
    expect(rounds.map(({ seconds }) => seconds)).toEqual([
      35, 40, 45, 45, 55, 55, 45, 45, 45, 45,
      50, 60, 70, 55, 65, 65, 75, 90, 60, 70,
      80, 80, 70, 90, 60, 70, 80, 80, 70, 90,
      60, 70, 80, 90, 60, 70, 80, 80, 90, 60,
      70, 80, 90, 60, 60, 60, 70, 80, 90, 60,
    ]);
    expect(rounds.flatMap(({ eased }, index) => (eased ? [index + 1] : []))).toEqual([7, 10, 23, 29, 46]);
    expect(rounds.every(({ seconds, halfway }) => halfway === seconds >= 60)).toBe(true);
  });

  it("get harder up to level 6 and then stay as hard", async () => {
    const { rounds } = await career();
    expect(balloonPop.plateau).toBe(6);
    expect(rounds.slice(0, 11).map(({ values }) => values.balloons)).toEqual([4, 6, 8, 8, 10, 10, 10, 12, 12, 12, 14]);
    const steady = rounds.filter(({ level, eased }) => level >= 6 && !eased).map(({ values }) => values);
    expect(steady.every((values) => values.balloons === 14 && values.rise === 2)).toBe(true);
    expect(rounds[45].values).toEqual({ balloons: 14, rise: 1.5 });
  });

  it("unwrap the six gifts in the declared order, on the 2nd, 5th, 9th, 11th, 14th and 18th counted win, and nothing after", async () => {
    const { rounds, last } = await career();
    expect(rounds.flatMap(({ gift }, index) => (gift ? [[index + 1, gift]] : []))).toEqual([
      [2, "kite"],
      [10, "parrot"],
      [14, "rocket"],
      [17, "comet"],
      [20, "moon"],
      [26, "rainbow"],
    ]);
    expect(last).toMatchObject({ received: ["kite", "parrot", "rocket", "comet", "moon", "rainbow"], chosen: "rainbow" });
    expect(balloonPop.owned(last)).toHaveLength(9);
  });
});
