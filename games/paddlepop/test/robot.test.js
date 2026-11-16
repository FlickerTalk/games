// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMatch, scoreOf, stepMatch } from "../src/match.js";
import { flickTarget, landing } from "../src/robot.js";
import { TABLE, frontOf } from "../src/table.js";

const R = TABLE.radius;
const BOTH = [true, true];

function playRound({ skill, seed, player = (match) => match.balls.find((one) => one.vy > 0)?.x ?? 0.5, seconds = 60, speed = 0.75 }) {
  let match = createMatch({ seed, speed, roundSteps: seconds * 120 });
  let flickHits = 0;
  while (!match.over) {
    match.paddles[0].target = player(match);
    match.paddles[1].target = flickTarget(match, 1, { skill });
    const out = stepMatch(match, BOTH);
    flickHits += out.events.filter((one) => one.kind === "hit" && one.seat === 1).length;
    match = out.match;
  }
  return { match, flickHits };
}

describe("Flick, the phone's paddle", () => {
  it("works out where a ball will reach its line, off the sides", () => {
    const ball = { x: 0.5, y: 1, vx: 0.6, vy: -0.6, slow: 0 };
    const x = landing(ball, 1);
    const travel = (1 - (frontOf(1) + R)) / 0.6;
    let raw = 0.5 + 0.6 * travel;
    if (raw > 1 - R) raw = 2 * (1 - R) - raw;
    expect(x).toBeCloseTo(raw, 9);
    expect(landing({ x: 0.5, y: 1, vx: 0, vy: -0.6 }, 1)).toBeCloseTo(0.5, 12);
  });

  it("goes back to the middle when nothing comes its way, and moves only once a ball is near enough for its skill", () => {
    const match = createMatch({ seed: "far", speed: 0.75, roundSteps: 7200 });
    const away = { ...match, balls: [{ ...match.balls[0], vy: 0.7 }], paddles: [{ x: 0.5, target: 0.5, wide: 0 }, { x: 0.3, target: 0.3, wide: 0 }] };
    expect(flickTarget(away, 1, { skill: 0.5 })).toBe(0.5);
    const far = { ...away, balls: [{ ...match.balls[0], x: 0.9, y: 1.4, vx: 0, vy: -0.7 }] };
    expect(flickTarget(far, 1, { skill: 0.45 })).toBe(0.5);
    const near = { ...far, balls: [{ ...far.balls[0], y: 0.5 }] };
    expect(Math.abs(flickTarget(near, 1, { skill: 0.45 }) - 0.9)).toBeLessThan(0.36);
  });

  it("aims the same way on every run of the same rally", () => {
    const match = createMatch({ seed: "same", speed: 0.75, roundSteps: 7200 });
    const near = { ...match, balls: [{ ...match.balls[0], y: 0.5, vy: -0.7 }] };
    expect(flickTarget(near, 1, { skill: 0.6 })).toBe(flickTarget(near, 1, { skill: 0.6 }));
  });

  it("plays like someone learning at the first level: it returns balls, and a player who follows the ball wins", { timeout: 60_000 }, () => {
    let won = 0;
    let hits = 0;
    for (const seed of ["a1", "b2", "c3", "d4", "e5", "f6"]) {
      const { match, flickHits } = playRound({ skill: 0.45, seed });
      if (scoreOf(match, 0) > scoreOf(match, 1)) won += 1;
      hits += flickHits;
    }
    expect(won).toBeGreaterThanOrEqual(5);
    expect(hits / 6).toBeGreaterThan(4);
  });

  it("is harder at the top of its skill, and still beaten by a player who angles the ball", { timeout: 60_000 }, () => {
    const angled = (match) => {
      const ball = match.balls.find((one) => one.vy > 0);
      if (!ball) return 0.5;
      return ball.x + (ball.x < 0.5 ? -1 : 1) * 0.17;
    };
    let straightGoals = 0;
    let angledGoals = 0;
    for (const seed of ["g1", "h2", "i3", "j4"]) {
      straightGoals += scoreOf(playRound({ skill: 0.8, seed, seconds: 45 }).match, 0);
      angledGoals += scoreOf(playRound({ skill: 0.8, seed, seconds: 45, player: angled }).match, 0);
    }
    expect(angledGoals).toBeGreaterThan(straightGoals);
    expect(angledGoals).toBeGreaterThanOrEqual(4);
  });

  it("eases off while it is ahead", () => {
    const match = createMatch({ seed: "ease", speed: 0.75, roundSteps: 7200 });
    const near = { ...match, balls: [{ ...match.balls[0], x: 0.2, y: 0.7, vx: 0, vy: -0.7 }], paddles: [{ x: 0.5, target: 0.5, wide: 0 }, { x: 0.8, target: 0.8, wide: 0 }] };
    const even = flickTarget(near, 1, { skill: 0.5 });
    const ahead = flickTarget({ ...near, lost: [3, 0] }, 1, { skill: 0.5 });
    expect(Math.abs(ahead - 0.2)).toBeGreaterThanOrEqual(Math.abs(even - 0.2));
  });
});
