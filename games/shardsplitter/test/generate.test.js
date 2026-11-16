import { describe, expect, it } from "vitest";
import { seedOf } from "../../../kit/src/canvas/random.js";
import { decodeSetup, encodeSetup, generateRound, poolFor } from "../src/generate.js";
import { HANDS, PROGRESS, TEAM_HANDS, roundSetup } from "../src/levels.js";
import { endsOf, fewestHits, splitsCleanly, standingMost } from "../src/numbers.js";

const SEEDS = Array.from({ length: 12 }, (_, at) => seedOf(`seed ${at}`));
const setupAt = (level, extra = {}) => roundSetup({ ...PROGRESS.fresh(), level }, { seed: SEEDS[level % SEEDS.length], ...extra });

describe("the numbers a hand can split", () => {
  it("are those that end on ones or on one small prime, never with more than twelve golems standing", () => {
    const pool = poolFor([[2, 5, 10]], { most: 100, hits: 4 });
    expect(pool).toEqual(expect.arrayContaining([10, 12, 14, 20, 30, 70]));
    for (const number of pool) {
      expect(splitsCleanly(number, [2, 5, 10]), String(number)).toBe(true);
      expect(standingMost(number, [2, 5, 10]), String(number)).toBeLessThanOrEqual(12);
      expect([...endsOf(number, [2, 5, 10])][0], String(number)).toBeLessThanOrEqual(13);
    }
    for (const out of [7, 9, 18, 50, 94, 100]) expect(pool, String(out)).not.toContain(out);
  });

  it("stay small and short on the first levels", () => {
    const pool = poolFor([[2, 5, 10]], { most: 30, hits: 2 });
    expect(Math.max(...pool)).toBeLessThanOrEqual(30);
    for (const number of pool) expect(fewestHits(number, [2, 5, 10])).toBeLessThanOrEqual(2);
    expect(pool.length).toBeGreaterThanOrEqual(8);
  });

  it("need both players of a team: neither hand finishes one alone", () => {
    for (const hands of TEAM_HANDS) {
      const pool = poolFor(hands, { most: 100, hits: 4, team: true });
      expect(pool.length, hands.join("|")).toBeGreaterThanOrEqual(8);
      for (const number of pool) {
        const end = [...endsOf(number, hands.flat())][0];
        for (const hand of hands) expect([...endsOf(number, hand)], `${number} with ${hand.join()}`).not.toContain(end);
      }
    }
  });

  it("are plenty for every hand", () => {
    for (const hand of HANDS) expect(poolFor([hand], { most: 100, hits: 4 }).length, hand.join()).toBeGreaterThanOrEqual(15);
  });
});

describe("a round's golems", () => {
  it("come the same from the same setup, as many as the level asks, each splittable to the end", () => {
    for (let level = 1; level <= 30; level += 1) {
      for (const team of [false, true]) {
        const setup = setupAt(level, { team });
        const round = generateRound(setup);
        expect(round, `level ${level}`).toEqual(generateRound(setup));
        expect(round.golems).toHaveLength(setup.golems);
        expect(round.hands).toHaveLength(team ? 2 : 1);
        for (const golem of round.golems) expect(splitsCleanly(golem.number, round.hands.flat(), golem.cap), `level ${level}: ${golem.number} cap ${golem.cap}`).toBe(true);
      }
    }
  });

  it("do not repeat a number while the hand has others to give", () => {
    const round = generateRound(setupAt(12));
    expect(new Set(round.golems.map((golem) => golem.number)).size).toBe(round.golems.length);
  });

  it("wear a cap only from the level that brings them, on a divisor that would have fitted, and never on the first golem", () => {
    expect(generateRound(setupAt(1)).golems.every((golem) => golem.cap === null)).toBe(true);
    let capped = 0;
    for (const seed of SEEDS) {
      const round = generateRound({ ...setupAt(15), seed });
      expect(round.golems[0].cap).toBeNull();
      for (const golem of round.golems.filter((one) => one.cap !== null)) {
        capped += 1;
        expect(round.hands.flat()).toContain(golem.cap);
        expect(golem.number % golem.cap).toBe(0);
      }
      expect(round.golems.filter((one) => one.cap !== null).length).toBeLessThanOrEqual(2);
    }
    expect(capped).toBeGreaterThan(0);
  });

  it("travel as a short code that gives the same round back, and nothing else is taken for one", () => {
    const setup = setupAt(9, { team: true });
    const code = encodeSetup(setup);
    expect(code).toMatch(/^S[A-Za-z0-9_-]{16}$/);
    expect(generateRound(decodeSetup(code))).toEqual(generateRound(setup));
    for (const bad of [null, 7, "", "S", `X${code.slice(1)}`, `${code}A`, code.replace(/^S1./, "S1z"), code.replace(/^(S..)./, "$10")]) expect(decodeSetup(bad), String(bad)).toBeNull();
  });
});
