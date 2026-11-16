import { describe, expect, it } from "vitest";
import { BUILD_SIZE, TOOLS, blankLevel, checkBuilt, paint } from "../src/editor.js";
import { checkLevel } from "../src/level.js";

const start = blankLevel();
const kinds = (level) => level.cells;

describe("making a level", () => {
  it("starts on an empty six by six floor with the robot at the bottom left facing up and the goal at the top right", () => {
    expect(BUILD_SIZE).toBe(6);
    expect(start.size).toBe(6);
    expect(start.start).toEqual({ at: 30, dir: 0 });
    expect(start.cells[5]).toBe("G");
    expect(checkLevel(start)).toBeNull();
    expect(TOOLS).toEqual(["wall", "puddle", "battery", "door", "goal", "robot"]);
  });

  it("paints a tile with the chosen tool, and the same tool again clears it", () => {
    const walled = paint(start, "wall", 14);
    expect(walled.changed).toBe(true);
    expect(kinds(walled.level)[14]).toBe("#");
    expect(kinds(paint(walled.level, "puddle", 14).level)[14]).toBe("~");
    expect(kinds(paint(walled.level, "wall", 14).level)[14]).toBe(".");
  });

  it("moves the goal, moves the robot, and turns the robot when its own tile is touched", () => {
    const goal = paint(start, "goal", 0).level;
    expect(kinds(goal)[0]).toBe("G");
    expect(kinds(goal)[5]).toBe(".");
    const moved = paint(start, "robot", 20).level;
    expect(moved.start).toEqual({ at: 20, dir: 0 });
    const turned = paint(moved, "robot", 20).level;
    expect(turned.start).toEqual({ at: 20, dir: 1 });
    expect(paint(turned, "robot", 20).level.start.dir).toBe(2);
    const onWall = paint(paint(start, "wall", 7).level, "robot", 7).level;
    expect(onWall.start.at).toBe(7);
    expect(kinds(onWall)[7]).toBe(".");
  });

  it("refuses to paint over the robot or the goal, and past four batteries or two doors", () => {
    expect(paint(start, "wall", 30)).toMatchObject({ changed: false, refused: true });
    expect(paint(start, "wall", 5)).toMatchObject({ changed: false, refused: true });
    expect(paint(start, "goal", 30).refused).toBe(true);
    expect(paint(start, "robot", 5).refused).toBe(true);
    let level = start;
    for (const at of [1, 2, 3, 4]) level = paint(level, "battery", at).level;
    expect(paint(level, "battery", 8)).toMatchObject({ refused: true, level });
    level = paint(paint(level, "door", 8).level, "door", 9).level;
    expect(paint(level, "door", 10).refused).toBe(true);
  });

  it("is ready to send only when the robot can reach the goal with every battery, within the strip", () => {
    expect(checkBuilt(start)).toEqual({ ok: true, best: 11 });
    const shut = [6, 7, 8, 9, 10, 11].reduce((level, at) => paint(level, "wall", at).level, start);
    expect(checkBuilt(shut)).toEqual({ ok: false, best: null });
  });
});
