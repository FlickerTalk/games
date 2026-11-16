import { describe, expect, it } from "vitest";
import { makeLevel } from "../src/level.js";
import { STEP_MS, poseAt, stepsDone, timeline } from "../src/motion.js";
import { runProgram } from "../src/run.js";

const level = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", "..~..", ".....", "....."] });

describe("the robot's motion through a run", () => {
  it("gives every step a calm, watchable length, and adds them up", () => {
    const run = runProgram(level, ["F", "R"]);
    const times = timeline(run.steps);
    expect(times.starts).toEqual([0, STEP_MS.move]);
    expect(times.total).toBe(STEP_MS.move + STEP_MS.turn);
    for (const ms of Object.values(STEP_MS)) expect(ms).toBeGreaterThanOrEqual(300);
  });

  it("slides from tile to tile while moving and turns a quarter while turning", () => {
    const run = runProgram(level, ["F", "R", "F"]);
    const start = 1000;
    expect(poseAt(run, start, start)).toMatchObject({ x: 2, y: 4, turn: 0, pose: "move" });
    const half = poseAt(run, start, start + STEP_MS.move / 2);
    expect(half.y).toBeGreaterThan(3);
    expect(half.y).toBeLessThan(4);
    const turning = poseAt(run, start, start + STEP_MS.move + STEP_MS.turn / 2);
    expect(turning.turn).toBeGreaterThan(0);
    expect(turning.turn).toBeLessThan(1);
    expect(turning.pose).toBe("turn");
  });

  it("nudges into a wall and steps into a puddle, then stops and shrugs", () => {
    const wet = runProgram(level, ["F", "F"]);
    const times = timeline(wet.steps);
    const after = poseAt(wet, 0, times.total + 50);
    expect(after).toMatchObject({ x: 2, y: 2, pose: "shrug", done: true });
    const walled = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", ".....", "..#..", "....."] });
    const bump = runProgram(walled, ["F"]);
    const middle = poseAt(bump, 0, STEP_MS.bump / 2);
    expect(middle.pose).toBe("bump");
    expect(middle.y).toBeLessThan(4);
    expect(poseAt(bump, 0, STEP_MS.bump + 10)).toMatchObject({ x: 2, y: 4, pose: "shrug" });
  });

  it("cheers on the goal", () => {
    const run = runProgram(level, ["R", "F", "L", "F", "F", "F", "F", "L", "F"]);
    expect(run.end).toBe("goal");
    expect(poseAt(run, 0, timeline(run.steps).total + 10)).toMatchObject({ x: 2, y: 0, pose: "cheer", done: true });
  });

  it("counts the steps already finished, for their sounds and sparkles", () => {
    const run = runProgram(level, ["F", "R"]);
    expect(stepsDone(run, 0, 0)).toBe(0);
    expect(stepsDone(run, 0, STEP_MS.move)).toBe(1);
    expect(stepsDone(run, 0, 99_999)).toBe(2);
  });
});
