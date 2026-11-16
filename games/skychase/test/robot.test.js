// @vitest-environment node
import { describe, expect, it } from "vitest";
import { apart } from "../src/arena.js";
import { createMatch, scoreOf, stepMatch } from "../src/match.js";
import { createMind, flickStep } from "../src/robot.js";

const BOTH = [true, true];
const SEEDS = Array.from({ length: 30 }, (_, at) => `q${at}`);

function playRound({ seed, skill, player = 0.95, seconds = 45, twists = 0, families = ["plane", "plane"] }) {
  const match = createMatch({ seed, twists, roundSteps: seconds * 120, families });
  const minds = [createMind(`${seed}/player`), createMind(seed)];
  while (!match.over) {
    flickStep(match, 0, minds[0], { skill: player, pace: false });
    flickStep(match, 1, minds[1], { skill });
    stepMatch(match, BOTH);
  }
  return match;
}

function tally(rounds) {
  const seen = { won: 0, lost: 0, mine: 0, theirs: 0 };
  for (const match of rounds) {
    const [mine, theirs] = [scoreOf(match, 0), scoreOf(match, 1)];
    seen.mine += mine;
    seen.theirs += theirs;
    if (mine > theirs) seen.won += 1;
    if (theirs > mine) seen.lost += 1;
  }
  return seen;
}

describe("Flick, the phone's pilot", () => {
  it("steers with the same one finger as the player: it comes round toward the other aircraft", () => {
    const match = createMatch({ seed: "aim00001", twists: 0, roundSteps: 6000 });
    const mind = createMind(match.seed);
    const before = apart(match.crafts[1], match.crafts[0]).far;
    let nearest = before;
    for (let at = 0; at < 600; at += 1) {
      flickStep(match, 1, mind, { skill: 1 });
      stepMatch(match, [false, true]);
      nearest = Math.min(nearest, apart(match.crafts[1], match.crafts[0]).far);
    }
    expect(nearest).toBeLessThan(before * 0.5);
  });

  it("plays the same round again from the same seed", () => {
    const [one, two] = [playRound({ seed: "same0001", skill: 0.5 }), playRound({ seed: "same0001", skill: 0.5 })];
    expect(one.crafts).toEqual(two.crafts);
    expect(one.step).toBe(two.step);
  });

  it("is no match for a good player at the first level", { timeout: 60_000 }, () => {
    const seen = tally(SEEDS.map((seed) => playRound({ seed, skill: 0.3 })));
    expect(seen.won).toBeGreaterThanOrEqual(24);
    expect(seen.lost).toBeLessThanOrEqual(2);
  });

  it("flies like someone learning at the first level: against a player who is learning too it pops a balloon now and then, and loses most rounds", { timeout: 60_000 }, () => {
    const seen = tally(SEEDS.map((seed) => playRound({ seed, skill: 0.3, player: 0.55 })));
    expect(seen.theirs).toBeGreaterThanOrEqual(5);
    expect(seen.won).toBeGreaterThanOrEqual(18);
    expect(seen.won).toBeGreaterThan(seen.lost * 3);
  });

  it("is a real rival at the top level: it beats the learning player, and a good player still beats it", { timeout: 60_000 }, () => {
    const learning = tally(SEEDS.map((seed) => playRound({ seed, skill: 0.86, player: 0.6, seconds: 70 })));
    const first = tally(SEEDS.map((seed) => playRound({ seed, skill: 0.3, player: 0.6, seconds: 70 })));
    expect(learning.theirs).toBeGreaterThan(first.theirs);
    expect(learning.lost).toBeGreaterThanOrEqual(12);
    const good = tally(SEEDS.map((seed) => playRound({ seed, skill: 0.86, seconds: 70 })));
    expect(good.won).toBeGreaterThanOrEqual(15);
    expect(good.theirs).toBeGreaterThanOrEqual(3);
  });

  it("copes with a full sky, and with helicopters", { timeout: 60_000 }, () => {
    for (const family of ["plane", "helicopter"]) {
      const seen = tally(SEEDS.map((seed) => playRound({ seed, skill: 0.5, player: 0.7, twists: 4, families: [family, family], seconds: 60 })));
      expect(seen.mine + seen.theirs, family).toBeGreaterThanOrEqual(10);
      expect(seen.won, family).toBeGreaterThanOrEqual(8);
    }
  });

  it("does not chase round and round the sky for ever behind a pilot as fast as itself: two equal pilots still pop balloons", () => {
    let popped = 0;
    for (const seed of SEEDS.slice(0, 10)) {
      const match = createMatch({ seed, twists: 0, roundSteps: 60 * 120 });
      const minds = [createMind(`${seed}/one`), createMind(`${seed}/two`)];
      while (!match.over) {
        flickStep(match, 0, minds[0], { skill: 0.95, pace: false });
        flickStep(match, 1, minds[1], { skill: 0.95, pace: false });
        stepMatch(match, BOTH);
      }
      popped += scoreOf(match, 0) + scoreOf(match, 1);
    }
    expect(popped).toBeGreaterThanOrEqual(10);
  });

  it("eases off when it is clearly ahead and tries harder when clearly behind", () => {
    const paceWith = (flickLost, playerLost) => {
      const match = createMatch({ seed: "pace0001", twists: 0, roundSteps: 6000 });
      match.crafts[1].lost = flickLost;
      match.crafts[0].lost = playerLost;
      flickStep(match, 1, createMind("pace0001"), { skill: 0.6 });
      return match.crafts[1].pace;
    };
    expect(paceWith(0, 2)).toBeLessThan(paceWith(0, 0));
    expect(paceWith(2, 0)).toBeGreaterThan(paceWith(0, 0));
    expect(paceWith(2, 0)).toBeLessThanOrEqual(1);
  });

  it("lets go of the stick once its balloons are gone", () => {
    const match = createMatch({ seed: "out00001", twists: 0, roundSteps: 6000 });
    const mind = createMind(match.seed);
    flickStep(match, 1, mind, { skill: 1 });
    match.crafts[1].out = 1;
    flickStep(match, 1, mind, { skill: 1 });
    expect(match.crafts[1].down).toBe(false);
  });
});
