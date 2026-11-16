import { describe, expect, it } from "vitest";
import { flickScript } from "../src/flick.js";
import { generateLevel } from "../src/generate.js";
import { makeLevel } from "../src/level.js";
import { add, countOf, emptyEdit, ring, trim } from "../src/program.js";
import { runProgram } from "../src/run.js";
import { shortest } from "../src/solver.js";

function play(level, script) {
  let edit = emptyEdit();
  const runs = [];
  for (const action of script) {
    if (action.kind === "add") edit = add(edit, action.command);
    if (action.kind === "ring") edit = ring(edit);
    if (action.kind === "cut") edit = trim(edit, action.slot);
    if (action.kind === "run") runs.push(runProgram(level, edit.items));
  }
  return { edit, runs };
}

const HARD = { size: 7, turns: 5, batteries: 2, blocks: 9, doors: 1 };
const SEEDS = Array.from({ length: 30 }, (_, at) => `flick${at}`);

describe("Flick solving a level on the phone", () => {
  it("types its program one command at a time and runs it to the goal, as short as the shortest way", () => {
    for (const seed of SEEDS) {
      const level = generateLevel(seed, HARD);
      const script = flickScript(level, { seed, loops: false });
      const { edit, runs } = play(level, script);
      expect(runs.at(-1).end, seed).toBe("goal");
      expect(countOf(edit.items), seed).toBeLessThanOrEqual(shortest(level).length);
      expect(script.filter((action) => action.kind !== "run").length, seed).toBeGreaterThan(1);
    }
  });

  it("is the same on every phone for the same seed", () => {
    const level = generateLevel("same", HARD);
    expect(flickScript(level, { seed: "same", loops: true })).toEqual(flickScript(level, { seed: "same", loops: true }));
  });

  it("sometimes drives into a wall or a puddle first, shrugs, cuts the strip at that command and fixes it", () => {
    const slips = SEEDS.map((seed) => {
      const level = generateLevel(seed, HARD);
      return { level, script: flickScript(level, { seed, loops: false }) };
    }).filter(({ script }) => script.some((action) => action.kind === "cut"));
    expect(slips.length).toBeGreaterThan(3);
    expect(slips.length).toBeLessThan(SEEDS.length);
    for (const { level, script } of slips) {
      const { runs } = play(level, script);
      expect(runs).toHaveLength(2);
      expect(["bump", "splash"]).toContain(runs[0].end);
      const cut = script.find((action) => action.kind === "cut");
      expect(cut.slot).toBe(runs[0].wrong);
      expect(runs[0].steps.at(-1).command).toBe("F");
      expect(runs[1].end).toBe("goal");
    }
  });

  it("folds repeats into rings once the player has rings too", () => {
    const corridor = makeLevel({ size: 7, start: { at: 42, dir: 0 }, rows: ["G......", ".......", ".......", ".......", ".......", ".......", "......."] });
    const { edit, runs } = play(corridor, flickScript(corridor, { seed: "rings", loops: true }));
    expect(runs.at(-1).end).toBe("goal");
    expect(edit.items.some((item) => typeof item === "object")).toBe(true);
    const plain = play(corridor, flickScript(corridor, { seed: "rings", loops: false }));
    expect(plain.edit.items.every((item) => typeof item === "string")).toBe(true);
  });
});
