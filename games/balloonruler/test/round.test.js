import { describe, expect, it } from "vitest";
import { MOST_SHOTS, numbersOf } from "../src/numbers.js";
import { FLIGHT, REVEAL, RIVAL_REVEAL, aimedBalloon, balloonsIn, indexOf, numberOf, resumeRound, roundSnapshot, scoreIn, shoot, startRound, stepRound, timeLeft } from "../src/round.js";

const SEED = "Ruler001";
const SETUP = { stage: 1, count: 3, spread: 0.3, ticks: false };
const fresh = (options = {}) => startRound({ seed: SEED, seconds: 35, setup: SETUP, ...options });

function play(round, share) {
  const events = [];
  let next = shoot(round, share);
  for (const step of [FLIGHT + 0.01, (next.rival ? RIVAL_REVEAL : REVEAL) + 0.01]) {
    const stepped = stepRound(next, step);
    next = stepped.round;
    events.push(...stepped.events);
  }
  return { round: next, events };
}

describe("a round", () => {
  it("shows the first number with its balloons and waits for the player: nothing moves but the clock", () => {
    const round = fresh();
    expect(indexOf(round)).toBe(0);
    expect(numberOf(round)).toEqual(numbersOf(SEED, 1)[0]);
    expect(balloonsIn(round).some((one) => one.real)).toBe(true);
    const { round: later, events } = stepRound(round, 5);
    expect(events).toEqual([]);
    expect(timeLeft(later)).toBe(30);
    expect(indexOf(later)).toBe(0);
  });

  it("lets the arrow fly, lands it with its stars, shows the true place a moment and moves to the next number", () => {
    const round = fresh();
    const truth = numberOf(round).share;
    const flying = shoot(round, truth);
    expect(flying.shot).toMatchObject({ index: 0, landed: false });
    expect(aimedBalloon(flying)).toMatchObject({ real: true });
    expect(aimedBalloon(round)).toBeNull();
    expect(shoot(flying, 0.9)).toBe(flying);
    const landed = stepRound(flying, FLIGHT + 0.01);
    expect(landed.events).toEqual([expect.objectContaining({ kind: "land", index: 0, stars: 3, far: false, real: true })]);
    expect(landed.round.guesses).toHaveLength(1);
    expect(indexOf(landed.round)).toBe(0);
    expect(balloonsIn(landed.round).some((one) => one.real)).toBe(false);
    const next = stepRound(landed.round, REVEAL + 0.01);
    expect(next.events).toEqual([{ kind: "next", index: 1 }]);
    expect(indexOf(next.round)).toBe(1);
    expect(scoreIn(next.round)).toBe(landed.events[0].points);
  });

  it("counts a far guess too, pops a decoy the arrow reaches, and leaves the true balloon floating", () => {
    const round = fresh();
    const decoy = balloonsIn(round).find((one) => !one.real);
    const { events, round: after } = play(round, decoy.share);
    const land = events.find((one) => one.kind === "land");
    expect(land).toMatchObject({ stars: 1, points: 1, far: true, real: false });
    expect(land.popped).toMatchObject({ share: decoy.share });
    expect(scoreIn(after)).toBe(1);
  });

  it("sticks the arrow on the ruler when no balloon floats there", () => {
    const round = fresh();
    const taken = balloonsIn(round).map((one) => one.share);
    const empty = [0.02, 0.5, 0.98, 0.25, 0.75].find((share) => taken.every((one) => Math.abs(one - share) > 0.07));
    const landed = stepRound(shoot(round, empty), FLIGHT + 0.01);
    expect(landed.events[0].popped).toBeNull();
    expect(balloonsIn(landed.round)).toHaveLength(balloonsIn(round).length);
  });

  it("quietly shows more marks on the ruler after three far guesses in a row", () => {
    let round = fresh();
    for (let shot = 0; shot < 3; shot += 1) {
      expect(round.ticks).toBe(false);
      const truth = numberOf(round).share;
      round = play(round, truth > 0.5 ? 0.02 : 0.98).round;
    }
    expect(round.ticks).toBe(true);
    expect(fresh({ setup: { ...SETUP, ticks: true } }).ticks).toBe(true);
  });

  it("forgets the far guesses as soon as one lands close", () => {
    let round = fresh();
    for (const close of [false, false, true, false, false]) {
      const truth = numberOf(round).share;
      round = play(round, close ? truth : truth > 0.5 ? 0.02 : 0.98).round;
    }
    expect(round.ticks).toBe(false);
  });

  it("ends when the time is up, after the arrow in the air has landed", () => {
    const round = stepRound(fresh(), 34.9).round;
    const flying = shoot(round, 0.5);
    const landed = stepRound(flying, 0.5);
    expect(landed.round.over).toBe(false);
    expect(landed.events.map((one) => one.kind)).toEqual(["land"]);
    const done = stepRound(landed.round, REVEAL + 0.1);
    expect(done.events.map((one) => one.kind)).toEqual(["next", "end"]);
    expect(done.round.over).toBe(true);
    expect(shoot(done.round, 0.5)).toBe(done.round);
    expect(stepRound(done.round, 1).events).toEqual([]);
  });

  it("gives Flick a little longer to answer each number", () => {
    const round = shoot(fresh({ rival: true }), 0.5);
    const landed = stepRound(round, FLIGHT + 0.01).round;
    expect(stepRound(landed, REVEAL + 0.05).events).toEqual([]);
    expect(stepRound(landed, RIVAL_REVEAL + 0.05).events).toEqual([{ kind: "next", index: 1 }]);
  });

  it("never asks for more numbers than a report can carry", () => {
    let round = fresh({ seconds: 100000 });
    for (let shot = 0; shot < MOST_SHOTS; shot += 1) round = play(round, 0.5).round;
    expect(round.over).toBe(true);
    expect(round.guesses).toHaveLength(MOST_SHOTS);
  });
});

describe("a round left halfway", () => {
  it("comes back with its time, its guesses and its marks, the arrow in the air forgotten", () => {
    let round = play(fresh(), 0.5).round;
    round = shoot(stepRound(round, 3).round, 0.4);
    const kept = JSON.parse(JSON.stringify(roundSnapshot(round)));
    const back = resumeRound(kept);
    expect(back.guesses).toEqual(round.guesses);
    expect(back.time).toBe(round.time);
    expect(back.shot).toBeNull();
    expect(indexOf(back)).toBe(1);
    expect(numberOf(back)).toEqual(numbersOf(SEED, 1)[1]);
  });

  it("is refused when what was kept is not a round", () => {
    const kept = roundSnapshot(fresh());
    expect(resumeRound(null)).toBeNull();
    expect(resumeRound({ ...kept, seed: 4 })).toBeNull();
    expect(resumeRound({ ...kept, guesses: [2] })).toBeNull();
    expect(resumeRound({ ...kept, setup: { ...SETUP, stage: 40 } })).toBeNull();
    expect(resumeRound({ ...kept, time: "soon" })).toBeNull();
  });
});
