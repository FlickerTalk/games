// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMatch, scoreOf, stepMatch } from "../src/match.js";
import { createMind, edgeAhead, flickStep } from "../src/robot.js";

const BOTH = [true, true];

function playRound({ seed, skill, player = 0.9, seconds = 45, variant = "plain" }) {
  const match = createMatch({ seed, variant, roundSteps: seconds * 120 });
  const minds = [createMind(`${seed}/player`), createMind(seed)];
  const seen = { bumps: [0, 0], dashes: [0, 0] };
  while (!match.over) {
    flickStep(match, 0, minds[0], { skill: player, pace: false });
    flickStep(match, 1, minds[1], { skill });
    for (const event of stepMatch(match, BOTH)) {
      if (event.kind === "bump") seen.bumps[event.by] += 1;
      if (event.kind === "dash") seen.dashes[event.seat] += 1;
    }
  }
  return { match, ...seen };
}

describe("Flick, the phone's player", () => {
  it("measures how far the edge is along a direction", () => {
    expect(edgeAhead({ x: 0, y: 0 }, { x: 1, y: 0 }, 1)).toBeCloseTo(1, 9);
    expect(edgeAhead({ x: 0.5, y: 0 }, { x: 1, y: 0 }, 1)).toBeCloseTo(0.5, 9);
    expect(edgeAhead({ x: 0.5, y: 0 }, { x: -1, y: 0 }, 1)).toBeCloseTo(1.5, 9);
    expect(edgeAhead({ x: 0, y: 0.6 }, { x: 0, y: 1 }, 0.8)).toBeCloseTo(0.2, 9);
  });

  it("waits for its arrow to come round to the player before it presses, then lets go and dashes at them", () => {
    const match = createMatch({ seed: "aim00001", variant: "plain", roundSteps: 6000 });
    const mind = createMind(match.seed);
    let dashed = null;
    for (let at = 0; at < 900 && !dashed; at += 1) {
      flickStep(match, 1, mind, { skill: 1 });
      dashed = stepMatch(match, [false, true]).find((one) => one.kind === "dash") ?? null;
    }
    expect(dashed).toMatchObject({ seat: 1 });
    const flick = match.bodies[1];
    expect(flick.vy).toBeGreaterThan(0.8);
    expect(Math.abs(flick.vx)).toBeLessThan(0.5);
  });

  it("plays the same round again from the same seed", () => {
    const [one, two] = [playRound({ seed: "same0001", skill: 0.5 }), playRound({ seed: "same0001", skill: 0.5 })];
    expect(one.match.bodies).toEqual(two.match.bodies);
    expect(one.match.step).toBe(two.match.step);
  });

  it("plays like someone learning at the first level: it bumps the player now and then, and a good player wins most rounds", { timeout: 60_000 }, () => {
    let won = 0;
    let bumps = 0;
    for (const seed of ["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8"]) {
      const round = playRound({ seed, skill: 0.3 });
      if (scoreOf(round.match, 0) > scoreOf(round.match, 1)) won += 1;
      bumps += round.bumps[1];
    }
    expect(won).toBeGreaterThanOrEqual(6);
    expect(bumps).toBeGreaterThanOrEqual(4);
  });

  it("is a real rival at the top of its skill, and still loses rounds", { timeout: 60_000 }, () => {
    const seeds = Array.from({ length: 24 }, (_, at) => `top-${at}`);
    const points = (skill) => seeds.reduce(([flick, player], seed) => {
      const { match } = playRound({ seed, skill, player: 0.5 });
      return [flick + scoreOf(match, 1), player + scoreOf(match, 0)];
    }, [0, 0]);
    const [hard, against] = points(0.86);
    const [easy] = points(0.3);
    expect(hard).toBeGreaterThan(easy);
    expect(against).toBeGreaterThanOrEqual(12);
  });

  it("gets through a round on every kind of platform", { timeout: 60_000 }, () => {
    for (const variant of ["shrink", "ice", "trampoline", "bar"]) {
      const { match, dashes } = playRound({ seed: `v-${variant}`, skill: 0.6, variant });
      expect(match.over, variant).toBe(true);
      expect(dashes[1], variant).toBeGreaterThan(2);
    }
  });

  it("takes longer between dashes while it is ahead", () => {
    const even = createMind("ease0001");
    const ahead = createMind("ease0001");
    const match = createMatch({ seed: "ease0001", variant: "plain", roundSteps: 6000 });
    const leading = createMatch({ seed: "ease0001", variant: "plain", roundSteps: 6000 });
    leading.bodies[0].lost = 2;
    const firstDash = (round, mind) => {
      for (let at = 0; at < 3000; at += 1) {
        flickStep(round, 1, mind, { skill: 0.6 });
        if (round.bodies[1].hold >= 0) return at;
        stepMatch(round, [false, true]);
      }
      return Infinity;
    };
    expect(firstDash(leading, ahead)).toBeGreaterThanOrEqual(firstDash(match, even));
  });
});
