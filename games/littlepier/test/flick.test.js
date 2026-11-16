import { describe, expect, it } from "vitest";
import { flickHolding, freshFlick } from "../src/flick.js";
import { startRound, stepRound } from "../src/round.js";

const REACH = Object.freeze({ w: 384, h: 560, radius: 26 });
const STEP = 1 / 30;

function playAlongside(seed, { rest, seconds = 35, pace = 0.08, player = () => false }) {
  let round = startRound({ seed, seconds, pace, anglers: 2 });
  let memory = freshFlick();
  const log = [];
  while (!round.over) {
    const flick = flickHolding(round, memory, { reach: REACH, rest });
    memory = flick.memory;
    if (round.hooks[1].fish !== null) expect(flick.holding).toBe(false);
    const done = stepRound(round, STEP, { holding: [player(round), flick.holding], reach: REACH });
    for (const event of done.events) log.push({ ...event, time: done.round.time });
    round = done.round;
  }
  return { round, log, memory };
}

describe("Flick, fishing at the other end of the pier", () => {
  it("catches a few on its own in a round, resting between them, and never the same twice", () => {
    for (const seed of ["FlickOne", "FlickTwo", "FlickTri", "FlickFor"]) {
      const { round, log } = playAlongside(seed, { rest: 2.5 });
      const mine = round.caught[1];
      expect(mine.length, seed).toBeGreaterThanOrEqual(3);
      expect(mine.length, seed).toBeLessThanOrEqual(12);
      expect(new Set(mine).size).toBe(mine.length);
      expect(round.caught[0]).toEqual([]);
      const catches = log.filter((one) => one.kind === "catch" && one.hook === 1).map((one) => one.time);
      catches.slice(1).forEach((time, at) => expect(time - catches[at], seed).toBeGreaterThanOrEqual(2.5));
    }
  });

  it("lets nothing slip: it reels in as soon as something bites", () => {
    const { log } = playAlongside("NoSlips1", { rest: 2.5, seconds: 60 });
    expect(log.filter((one) => one.kind === "slip")).toEqual([]);
  });

  it("fishes the same round the same way every time", () => {
    expect(playAlongside("SameWays", { rest: 3 }).round.caught).toEqual(playAlongside("SameWays", { rest: 3 }).round.caught);
  });

  it("catches less when it rests longer, so the phone can ease off or lend a hand", () => {
    const total = (rest) => ["Rest0001", "Rest0002", "Rest0003", "Rest0004", "Rest0005"].reduce((sum, seed) => sum + playAlongside(seed, { rest, seconds: 60 }).round.caught[1].length, 0);
    expect(total(1)).toBeGreaterThan(total(5));
  });

  it("keeps its memory as plain data", () => {
    const { memory } = playAlongside("PlainOne", { rest: 2.5 });
    expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
  });
});
