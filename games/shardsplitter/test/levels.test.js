import { describe, expect, it } from "vitest";
import { isPrime } from "../src/numbers.js";
import { HANDS, LOOKS, PROGRESS, TEAM_HANDS, handsFor, pointsFor, roundSetup, wonRound } from "../src/levels.js";

const primesOf = (value) => [2, 3, 5, 7].filter((prime) => value % prime === 0);

describe("the levels", () => {
  it("start with 2, 5 and 10 and bring a new hand of three divisors every two levels, over and over", () => {
    expect(HANDS[0]).toEqual([2, 5, 10]);
    expect(roundSetup(PROGRESS.fresh(), { seed: "AAAAAAAA" })).toMatchObject({ level: 1, team: false, tier: 0, golems: 5, most: 30, hits: 2, caps: 0, seed: "AAAAAAAA" });
    expect(roundSetup({ ...PROGRESS.fresh(), level: 3 }, { seed: "AAAAAAAA" }).tier).toBe(1);
    expect(roundSetup({ ...PROGRESS.fresh(), level: 1 + 2 * HANDS.length }, { seed: "AAAAAAAA" }).tier).toBe(0);
  });

  it("grow gently: more golems, larger numbers, longer chains and a cap or two, and ease off after two losses", () => {
    const late = roundSetup({ ...PROGRESS.fresh(), level: 40 }, { seed: "AAAAAAAA" });
    expect(late).toMatchObject({ golems: 8, most: 100, hits: 4, caps: 2 });
    const eased = roundSetup({ ...PROGRESS.fresh(), level: 40, losses: 2 }, { seed: "AAAAAAAA" });
    expect(eased.eased).toBe(true);
    expect(eased.golems).toBeLessThan(late.golems);
    expect(eased.most).toBeLessThan(late.most);
    expect(PROGRESS.spec.timed).toBe(false);
  });

  it("give every hand the primes its larger divisors are made of, so a golem never gets stuck", () => {
    for (const hand of [...HANDS, ...TEAM_HANDS.map((pair) => pair.flat())]) {
      expect(new Set(hand).size, hand.join()).toBe(hand.length);
      for (const divisor of hand) for (const prime of primesOf(divisor)) expect(hand, `${hand.join()} for ${divisor}`).toContain(prime);
      expect(hand.some(isPrime)).toBe(true);
    }
  });

  it("deal a team two hands with no divisor in common", () => {
    for (const [mine, theirs] of TEAM_HANDS) expect(mine.filter((divisor) => theirs.includes(divisor))).toEqual([]);
    expect(handsFor({ team: true, tier: 0 })).toEqual(TEAM_HANDS[0]);
    expect(handsFor({ team: false, tier: 1 })).toEqual([HANDS[1]]);
    expect(roundSetup(PROGRESS.fresh(), { team: true, seed: "AAAAAAAA" })).toMatchObject({ team: true, tier: 0 });
  });

  it("score a round by its clinks: none is three stars, and a round is lost only after many", () => {
    expect([0, 1, 2, 3, 9].map(pointsFor)).toEqual([100, 85, 70, 55, 10]);
    expect(wonRound(4)).toBe(true);
    expect(wonRound(5)).toBe(false);
    expect(PROGRESS.spec.stars).toEqual({ two: 70, three: 100 });
  });

  it("give mallets and places as looks, one of each from the start and the rest as gifts", () => {
    expect(LOOKS).toEqual({ mallet: ["block", "round", "wedge"], place: ["workshop", "ice", "candy"] });
    expect(PROGRESS.fresh().chosen).toEqual({ mallet: "block", place: "workshop" });
    expect(PROGRESS.schedule).toHaveLength(4);
  });
});
