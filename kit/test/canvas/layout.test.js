import { describe, expect, it } from "vitest";
import { CORNER, box, centreOf, grid, overlap, row, span, within } from "../../src/canvas/layout.js";

describe("the layout helpers", () => {
  it("make boxes and find their centres and whether a point is inside", () => {
    const area = box(10, 20, 30, 40);
    expect(area).toEqual({ x: 10, y: 20, w: 30, h: 40 });
    expect(centreOf(area)).toEqual([25, 40]);
    expect(within(area, { x: 10, y: 20 })).toBe(true);
    expect(within(area, { x: 40, y: 30 })).toBe(false);
    expect(within(area, { x: 39.9, y: 59.9 })).toBe(true);
  });

  it("say whether two boxes overlap, touching edges not counting", () => {
    expect(overlap(box(0, 0, 10, 10), box(5, 5, 10, 10))).toBe(true);
    expect(overlap(box(0, 0, 10, 10), box(10, 0, 10, 10))).toBe(false);
  });

  it("lay targets in a row and in a grid, with the gap between them", () => {
    expect(row([["a", 1], ["b", 2]], 10, 20, 88, 16)).toEqual([
      { kind: "a", value: 1, x: 10, y: 20, w: 88, h: 88 },
      { kind: "b", value: 2, x: 114, y: 20, w: 88, h: 88 },
    ]);
    const cells = grid([["c", 0], ["c", 1], ["c", 2]], 0, 0, 2, 88);
    expect(cells.map(({ x, y }) => [x, y])).toEqual([[0, 0], [96, 0], [0, 96]]);
    expect(span(3, 88)).toBe(3 * 88 + 2 * 8);
    expect(span(0, 88)).toBe(0);
  });

  it("keep the bottom corners of a full screen free, where the frame meets the screen's rounded corners", () => {
    expect(CORNER).toBe(40);
  });
});
