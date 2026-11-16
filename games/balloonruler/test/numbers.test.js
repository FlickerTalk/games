import { describe, expect, it } from "vitest";
import { MOST_SHOTS, STAGES, balloonsOf, numbersOf, quantise } from "../src/numbers.js";

const SEED = "Ruler001";

describe("the numbers of a round", () => {
  it("are the same on every phone for the same seed and ruler, and differ with another seed", () => {
    expect(numbersOf(SEED, 1)).toEqual(numbersOf(SEED, 1));
    expect(numbersOf(SEED, 1)).not.toEqual(numbersOf("Ruler002", 1));
    expect(numbersOf(SEED, 1)).toHaveLength(MOST_SHOTS);
  });

  it("live inside the ruler, never on its numbered ends, and never twice in a row", () => {
    STAGES.forEach((stage, at) => {
      const numbers = numbersOf(SEED, at);
      numbers.forEach((number, index) => {
        expect(number.share, `${at}/${index}`).toBeGreaterThan(0);
        expect(number.share, `${at}/${index}`).toBeLessThan(1);
        expect(number.share).toBeCloseTo(number.value / stage.range, 9);
        expect([0, 1, 2]).toContain(number.size);
        if (index) expect(number.share, `${at}/${index}`).not.toBe(numbers[index - 1].share);
      });
    });
  });

  it("start with whole numbers shown as dots, then digits on longer rulers, then fractions as a bar", () => {
    expect(STAGES[0]).toMatchObject({ range: 10, card: "dots" });
    expect(STAGES[1]).toMatchObject({ range: 10, card: "digit" });
    expect(STAGES.map((stage) => stage.range)).toEqual([10, 10, 20, 100, 100, 1, 1000]);
    for (const number of numbersOf(SEED, 0)) expect(number.card).toEqual({ kind: "dots", value: number.value });
    for (const number of numbersOf(SEED, 3)) expect(number.value % 10).toBe(0);
    for (const number of numbersOf(SEED, 2)) expect(Number.isInteger(number.value)).toBe(true);
    for (const number of numbersOf(SEED, 5)) {
      expect(number.card.kind).toBe("fraction");
      expect([2, 3, 4, 5]).toContain(number.card.parts);
      expect(number.card.filled).toBeGreaterThan(0);
      expect(number.card.filled).toBeLessThan(number.card.parts);
      expect(number.share).toBeCloseTo(number.card.filled / number.card.parts, 9);
    }
  });

  it("fall back on the first ruler for a stage that does not exist", () => {
    expect(numbersOf(SEED, 99)).toEqual(numbersOf(SEED, 0));
  });
});

describe("the balloons over the ruler", () => {
  it("float one over the true place and the others apart from it and from each other", () => {
    for (const [count, spread] of [[3, 0.3], [4, 0.2], [5, 0.12]]) {
      numbersOf(SEED, 4).slice(0, 20).forEach((number, index) => {
        const balloons = balloonsOf(SEED, index, number, { count, spread });
        const real = balloons.filter((one) => one.real);
        expect(real).toHaveLength(1);
        expect(real[0]).toMatchObject({ share: number.share, size: number.size });
        expect(balloons.length).toBeLessThanOrEqual(count);
        expect(balloons.length).toBeGreaterThanOrEqual(2);
        balloons.forEach((one, at) => {
          if (!one.real) expect(one.share).toBeGreaterThanOrEqual(0.03);
          if (!one.real) expect(one.share).toBeLessThanOrEqual(0.97);
          expect(one.lift).toBeGreaterThanOrEqual(0);
          expect(one.lift).toBeLessThanOrEqual(1);
          for (const other of balloons.slice(at + 1)) expect(Math.abs(one.share - other.share), `${index}`).toBeGreaterThanOrEqual(spread - 1e-9);
        });
      });
    }
  });

  it("are the same every time for the same number", () => {
    const number = numbersOf(SEED, 1)[3];
    expect(balloonsOf(SEED, 3, number, { count: 4, spread: 0.2 })).toEqual(balloonsOf(SEED, 3, number, { count: 4, spread: 0.2 }));
  });
});

describe("a place on the ruler", () => {
  it("is kept in 4096 steps, so both phones score the same guess alike", () => {
    expect(quantise(0)).toBe(0);
    expect(quantise(1)).toBe(1);
    expect(quantise(1.4)).toBe(1);
    expect(quantise(-3)).toBe(0);
    expect(quantise(0.5) * 4095).toBeCloseTo(Math.round(0.5 * 4095), 9);
    expect(quantise(Number.NaN)).toBe(0);
  });
});
