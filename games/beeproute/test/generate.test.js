import { describe, expect, it } from "vitest";
import { generateLevel } from "../src/generate.js";
import { checkLevel, encodeLevel } from "../src/level.js";
import { MOST } from "../src/program.js";
import { runProgram } from "../src/run.js";
import { shortest } from "../src/solver.js";

const EASY = { size: 5, turns: 1, batteries: 0, blocks: 2, doors: 0 };
const HARD = { size: 7, turns: 5, batteries: 3, blocks: 9, doors: 1 };
const SEEDS = Array.from({ length: 24 }, (_, at) => `seed${at}`);
const count = (level, kind) => [...level.cells].filter((one) => one === kind).length;
const average = (values) => values.reduce((sum, one) => sum + one, 0) / values.length;

describe("a level made from a seed", () => {
  it("is the same level for the same seed and values, and another for another seed", () => {
    expect(generateLevel("abc", EASY)).toEqual(generateLevel("abc", EASY));
    const made = new Set(SEEDS.map((seed) => encodeLevel(generateLevel(seed, EASY))));
    expect(made.size).toBeGreaterThan(SEEDS.length * 0.8);
  });

  it("can always be solved, within the strip, by a program the robot really runs", () => {
    for (const values of [EASY, HARD, { ...EASY, size: 6, batteries: 2, turns: 3 }]) {
      for (const seed of SEEDS) {
        const level = generateLevel(seed, values);
        expect(checkLevel(level), seed).toBeNull();
        const way = shortest(level);
        expect(way, seed).not.toBeNull();
        expect(way.length, seed).toBeLessThanOrEqual(MOST - 4);
        expect(runProgram(level, way).end, seed).toBe("goal");
      }
    }
  });

  it("takes its size, batteries and doors from the values of the player's level", () => {
    for (const seed of SEEDS.slice(0, 8)) {
      expect(generateLevel(seed, EASY).size).toBe(5);
      expect(count(generateLevel(seed, EASY), "B")).toBe(0);
      expect(count(generateLevel(seed, EASY), "D")).toBe(0);
      const hard = generateLevel(seed, HARD);
      expect(hard.size).toBe(7);
      expect(count(hard, "B")).toBe(3);
      expect(count(hard, "D")).toBe(1);
      expect(count(hard, "#") + count(hard, "~")).toBeGreaterThanOrEqual(6);
    }
    expect(generateLevel("x", { ...EASY, size: 6.75, batteries: 1.6 }).size).toBe(6);
    expect(count(generateLevel("x", { ...EASY, batteries: 1.6 }), "B")).toBe(1);
  });

  it("asks for longer programs as the values grow", () => {
    const easy = average(SEEDS.map((seed) => shortest(generateLevel(seed, EASY)).length));
    const hard = average(SEEDS.map((seed) => shortest(generateLevel(seed, HARD)).length));
    expect(easy).toBeGreaterThanOrEqual(3);
    expect(easy).toBeLessThan(8);
    expect(hard).toBeGreaterThan(easy + 4);
  });
});
