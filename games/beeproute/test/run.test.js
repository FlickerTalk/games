import { describe, expect, it } from "vitest";
import { makeLevel } from "../src/level.js";
import { emptyEdit, ring, add } from "../src/program.js";
import { runProgram, startOf, stepFrom } from "../src/run.js";

const level = (rows, at, dir = 0) => makeLevel({ size: rows.length, start: { at, dir }, rows });
const OPEN = ["..G..", ".....", ".....", ".....", "....."];
const events = (run) => run.steps.map((step) => step.event);
const ringOf = (times, body) => body.reduce((edit, command) => add(edit, command), times === 3 ? ring(ring(emptyEdit())) : ring(emptyEdit())).items;

describe("one step of the robot", () => {
  it("moves one tile forward, turns a quarter each way and starts where the level says", () => {
    const plain = level(OPEN, 22, 0);
    const start = startOf(plain);
    expect(start).toEqual({ x: 2, y: 4, dir: 0, got: 0, opened: 0 });
    expect(stepFrom(plain, start, "F")).toEqual({ state: { ...start, y: 3 }, event: "move" });
    expect(stepFrom(plain, start, "L").state.dir).toBe(3);
    expect(stepFrom(plain, start, "R").state.dir).toBe(1);
    expect(stepFrom(plain, start, "L").event).toBe("turn");
  });

  it("bumps into a wall, a closed door and the edge, and stays where it was", () => {
    const walled = level(["..G..", ".....", ".....", "..#..", "D...."], 22, 0);
    expect(stepFrom(walled, startOf(walled), "F")).toEqual({ state: startOf(walled), event: "bump" });
    expect(stepFrom(walled, { ...startOf(walled), dir: 2 }, "F").event).toBe("bump");
    expect(stepFrom(walled, { x: 1, y: 4, dir: 3, got: 0, opened: 0 }, "F").event).toBe("bump");
  });

  it("opens the door it faces with use, and does nothing with use anywhere else", () => {
    const door = level(["..G..", ".....", "..D..", ".....", "....."], 17, 0);
    const opened = stepFrom(door, startOf(door), "U");
    expect(opened.event).toBe("open");
    expect(opened.state.opened).toBe(1);
    expect(stepFrom(door, opened.state, "F").event).toBe("move");
    expect(stepFrom(door, { ...startOf(door), dir: 1 }, "U")).toEqual({ state: { ...startOf(door), dir: 1 }, event: "idle" });
  });

  it("steps into a puddle and stops there", () => {
    const wet = level(["..G..", ".....", ".....", "..~..", "....."], 22, 0);
    expect(stepFrom(wet, startOf(wet), "F")).toEqual({ state: { ...startOf(wet), y: 3 }, event: "splash" });
  });
});

describe("a whole run", () => {
  it("collects every battery on the way and cheers on the goal", () => {
    const two = level(["G....", "B....", ".....", ".B...", "....."], 21, 0);
    const run = runProgram(two, ["F", "L", "F", "R", "F", "F", "F"]);
    expect(events(run)).toEqual(["battery", "turn", "move", "turn", "move", "battery", "goal"]);
    expect(run.end).toBe("goal");
    expect(run.wrong).toBeNull();
    expect(run.got).toBe(3);
  });

  it("walks over the goal while a battery is left, as if it were floor", () => {
    const behind = level([".B...", ".G...", ".....", ".....", "....."], 21, 0);
    const run = runProgram(behind, ["F", "F", "F", "F", "R", "R", "F"]);
    expect(events(run)).toEqual(["move", "move", "move", "battery", "turn", "turn", "goal"]);
  });

  it("stops at the command that went wrong, and never runs the ones after it", () => {
    const wall = level(["..G..", "..#..", ".....", ".....", "....."], 22, 0);
    const run = runProgram(wall, ["F", "F", "F", "F", "F"]);
    expect(run.end).toBe("bump");
    expect(run.wrong).toBe(2);
    expect(run.steps).toHaveLength(3);
  });

  it("marks the first empty slot when the program ends before the goal", () => {
    const run = runProgram(level(OPEN, 22, 0), ["F", "F"]);
    expect(run.end).toBe("short");
    expect(run.wrong).toBe(2);
    expect(runProgram(level(OPEN, 22, 0), []).wrong).toBe(0);
  });

  it("runs a ring's commands as many times as it says, lighting the same slots again", () => {
    const run = runProgram(level(OPEN, 22, 0), ringOf(2, ["F", "F"]));
    expect(run.end).toBe("goal");
    expect(run.steps.map((step) => step.slot)).toEqual([0, 1, 0, 1]);
    expect(runProgram(level(OPEN, 22, 0), ringOf(3, ["F"])).end).toBe("short");
  });
});
