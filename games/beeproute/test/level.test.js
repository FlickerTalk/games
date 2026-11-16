import { describe, expect, it } from "vitest";
import { LIMITS, aheadOf, cellOf, checkLevel, decodeLevel, encodeLevel, makeLevel, placeOf } from "../src/level.js";

const ROWS = ["..G..", ".##..", ".B...", "...~.", "....."];
const sample = () => makeLevel({ size: 5, start: { at: 20, dir: 0 }, rows: ROWS });

describe("a level", () => {
  it("is a square of five to seven tiles a side, with one goal, a start on the floor and the robot facing one of four ways", () => {
    const level = sample();
    expect(level.size).toBe(5);
    expect(level.cells).toBe(ROWS.join(""));
    expect(checkLevel(level)).toBeNull();
    expect(Object.isFrozen(level)).toBe(true);
    expect(checkLevel(makeLevel({ size: 4, start: { at: 0, dir: 0 }, rows: ["...G", "....", "....", "...."] }))).toBe("size");
    expect(checkLevel(makeLevel({ size: 5, start: { at: 2, dir: 0 }, rows: ROWS }))).toBe("start");
    expect(checkLevel(makeLevel({ size: 5, start: { at: 20, dir: 4 }, rows: ROWS }))).toBe("start");
    expect(checkLevel(makeLevel({ size: 5, start: { at: 20, dir: 0 }, rows: ROWS.map((row) => row.replace("G", ".")) }))).toBe("goal");
    expect(checkLevel(makeLevel({ size: 5, start: { at: 20, dir: 0 }, rows: ["G.G..", ...ROWS.slice(1)] }))).toBe("goal");
  });

  it("holds at most four batteries and two doors, so the phone can always work out the way", () => {
    expect(LIMITS).toEqual({ batteries: 4, doors: 2 });
    const many = makeLevel({ size: 5, start: { at: 20, dir: 0 }, rows: ["BBBBB", "..G..", ".....", ".....", "....."] });
    expect(checkLevel(many)).toBe("batteries");
    const doors = makeLevel({ size: 5, start: { at: 20, dir: 0 }, rows: ["DDD..", "..G..", ".....", ".....", "....."] });
    expect(checkLevel(doors)).toBe("doors");
  });

  it("reads its tiles by column and row, and nothing outside", () => {
    const level = sample();
    expect(cellOf(level, 2, 0)).toBe("G");
    expect(cellOf(level, 1, 1)).toBe("#");
    expect(cellOf(level, 3, 3)).toBe("~");
    expect(cellOf(level, -1, 0)).toBeNull();
    expect(cellOf(level, 5, 0)).toBeNull();
    expect(placeOf(level, 20)).toEqual({ x: 0, y: 4 });
  });

  it("knows the tile in front of the robot for each way it faces", () => {
    const level = sample();
    expect(aheadOf(level, { x: 0, y: 4, dir: 0 })).toEqual({ x: 0, y: 3 });
    expect(aheadOf(level, { x: 0, y: 4, dir: 1 })).toEqual({ x: 1, y: 4 });
    expect(aheadOf(level, { x: 0, y: 4, dir: 2 })).toEqual({ x: 0, y: 5 });
    expect(aheadOf(level, { x: 0, y: 4, dir: 3 })).toEqual({ x: -1, y: 4 });
  });

  it("travels as one short move of under 64 letters, and comes back the same", () => {
    const big = makeLevel({ size: 7, start: { at: 45, dir: 3 }, rows: ["......G", ".###...", ".B..~..", "...#.#.", ".B...D.", "..##...", "......."] });
    for (const level of [sample(), big]) {
      const code = encodeLevel(level);
      expect(code.length).toBeLessThanOrEqual(64);
      expect(code).toMatch(/^L[A-Za-z0-9_-]+$/);
      expect(decodeLevel(code)).toEqual(level);
    }
  });

  it("refuses anything that is not a whole level", () => {
    const code = encodeLevel(sample());
    for (const bad of [null, 7, "", "P123", code.slice(0, -1), `${code}A`, code.replace(/^L5/, "L4"), code.replace(/^(L5.)0/, "$19"), `L5${"~".repeat(15)}`]) {
      expect(decodeLevel(bad), String(bad)).toBeNull();
    }
    const noGoal = encodeLevel(makeLevel({ size: 5, start: { at: 20, dir: 0 }, rows: ROWS.map((row) => row.replace("G", ".")) }));
    expect(decodeLevel(noGoal)).toBeNull();
  });
});
