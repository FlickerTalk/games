import { describe, expect, it } from "vitest";
import { makeLevel } from "../src/level.js";
import { countOf } from "../src/program.js";
import { runProgram } from "../src/run.js";
import { nextHint, shortest, withLoops } from "../src/solver.js";

const level = (rows, at, dir = 0) => makeLevel({ size: rows.length, start: { at, dir }, rows });

describe("the shortest way", () => {
  it("is found for a level, and solves it", () => {
    const plain = level(["..G..", ".....", ".....", ".....", "....."], 22);
    expect(shortest(plain)).toEqual(["F", "F", "F", "F"]);
    const turn = level(["....G", ".....", ".....", ".....", "....."], 20);
    const way = shortest(turn);
    expect(way).toHaveLength(9);
    expect(runProgram(turn, way).end).toBe("goal");
  });

  it("goes round walls and puddles, picks up every battery and opens the doors on the way", () => {
    const tricky = level(["G.#..", "..~..", "#D#B.", ".....", "....."], 21);
    const way = shortest(tricky);
    expect(way).not.toBeNull();
    expect(way).toContain("U");
    expect(runProgram(tricky, way).end).toBe("goal");
    expect(runProgram(tricky, way).got).toBe(1);
  });

  it("says there is none when the goal or a battery cannot be reached", () => {
    expect(shortest(level(["..G..", "#####", ".....", ".....", "....."], 22))).toBeNull();
    expect(shortest(level(["..G..", ".....", ".....", "###..", "B#..."], 22))).toBeNull();
    expect(shortest(level(["..G..", ".....", ".....", "..~..", "....."], 22))).not.toBeNull();
    expect(shortest(level(["..G..", ".....", ".....", ".~~~.", "~~.~~"], 22))).toBeNull();
  });
});

describe("rings", () => {
  it("fold a run of the same commands into one ring when that saves commands", () => {
    expect(withLoops(["F", "F", "F", "F", "F", "F"])).toEqual([{ times: 3, body: ["F", "F"] }]);
    expect(withLoops(["R", "F", "F", "L", "F", "F", "L", "F", "F"])).toEqual(["R", { times: 2, body: ["F", "F", "L"] }, "F", "F"]);
    expect(withLoops(["F", "R", "F"])).toEqual(["F", "R", "F"]);
    for (const way of [["F", "F", "F", "F", "F", "F", "F", "R", "F", "F"], ["L", "F", "L", "F", "L", "F", "R"]]) {
      const folded = withLoops(way);
      expect(countOf(folded)).toBeLessThan(way.length);
      const open = level(["G......", ".......", ".......", ".......", ".......", ".......", "......."], 48);
      expect(runProgram(open, folded).steps.map((step) => step.command)).toEqual(runProgram(open, way).steps.map((step) => step.command));
    }
  });
});

describe("a hint", () => {
  it("points at the next right command after the part of the program that works", () => {
    const turn = level(["....G", ".....", ".....", ".....", "....."], 20);
    expect(nextHint(turn, [])).toEqual({ cut: null, command: "F" });
    const wrong = level(["..G..", "..#..", ".....", ".....", "....."], 22);
    const hint = nextHint(wrong, ["F", "F", "F"]);
    expect(hint.cut).toBe(2);
    expect(["L", "R"]).toContain(hint.command);
  });

  it("gives nothing once the program already reaches the goal", () => {
    const plain = level(["..G..", ".....", ".....", ".....", "....."], 22);
    expect(nextHint(plain, ["F", "F", "F", "F"])).toBeNull();
  });
});
