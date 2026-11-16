import { describe, expect, it } from "vitest";
import { along, easeInOut, progressOf } from "../../src/tabletop/motion.js";

const near = (value, expected) => expect(value).toBeCloseTo(expected, 6);

describe("a piece moving across the board", () => {
  it("counts its progress from when it started, from 0 to 1 and no further", () => {
    expect(progressOf(1000, 200, 900)).toBe(0);
    expect(progressOf(1000, 200, 1050)).toBe(0.25);
    expect(progressOf(1000, 200, 1500)).toBe(1);
    expect(progressOf(1000, 0, 1000)).toBe(1);
  });

  it("eases in and out, still at both ends", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    near(easeInOut(0.5), 0.5);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(-1)).toBe(0);
  });

  it("goes through every point of its path, each leg taking an equal share", () => {
    const path = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }];
    expect(along(path, 0)).toMatchObject({ x: 0, y: 0, lift: 0, segment: 0 });
    expect(along(path, 0.25)).toMatchObject({ x: 5, y: 0, segment: 0 });
    expect(along(path, 0.75)).toMatchObject({ x: 10, y: 10, segment: 1 });
    expect(along(path, 1)).toMatchObject({ x: 10, y: 20, lift: 0, segment: 1 });
  });

  it("rises over the legs that hop, highest halfway, and lands flat", () => {
    const path = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }];
    const hop = (segment) => (segment === 1 ? 8 : 0);
    near(along(path, 0.25, { hop }).lift, 0);
    near(along(path, 0.75, { hop }).lift, 8);
    near(along(path, 0.75, { hop }).y, -8);
    near(along(path, 1, { hop }).lift, 0);
    near(along(path, 0.5, { hop: 6 }).lift, 0);
    near(along(path, 0.25, { hop: 6 }).lift, 6);
  });

  it("stays put on a path of one point", () => {
    expect(along([{ x: 3, y: 4 }], 0.6)).toMatchObject({ x: 3, y: 4, lift: 0, segment: 0 });
  });
});
