import { describe, expect, it } from "vitest";
import { randomOf } from "../../../kit/src/canvas/random.js";
import { FLICK_PACE, flickHit } from "../src/flick.js";
import { startRound, strike, turnOf, usefulNow } from "../src/round.js";

const TEAM = { hands: [[2, 4], [3, 5, 15]], golems: [{ number: 60, cap: null }, { number: 30, cap: 15 }] };

describe("Flick as the teammate", () => {
  it("hits only on its own turn, always with a divisor that fits", () => {
    const random = randomOf("flick");
    let round = startRound(TEAM);
    expect(flickHit(round, 1, random)).toBeNull();
    round = strike(round, 0, 2).round;
    expect(turnOf(round)).toBe(1);
    for (let at = 0; at < 20; at += 1) expect(usefulNow(round, 1)).toContain(flickHit(round, 1, random));
  });

  it("mostly takes its smallest divisor that fits, leaving the rest of the golem to the player", () => {
    const random = randomOf("small");
    const round = strike(startRound(TEAM), 0, 2).round;
    const picks = Array.from({ length: 40 }, () => flickHit(round, 1, random));
    expect(picks.filter((divisor) => divisor === 3).length).toBeGreaterThan(20);
    expect(new Set(picks).size).toBeGreaterThan(1);
  });

  it("never tries the capped divisor", () => {
    const random = randomOf("cap");
    let round = startRound(TEAM);
    for (const [side, divisor] of [[0, 4], [1, 15]]) round = strike(round, side, divisor).round;
    expect(round).toMatchObject({ at: 1, value: 30 });
    round = strike(round, 0, 2).round;
    for (let at = 0; at < 20; at += 1) expect(flickHit(round, 1, random)).not.toBe(15);
  });

  it("waits long enough between hits for the player to follow", () => {
    expect(FLICK_PACE).toBeGreaterThanOrEqual(900);
  });
});
