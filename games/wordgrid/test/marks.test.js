import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawLastWord, drawPendingClock, drawTrace, drawWordBurst } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 40;
const POINTS = [[20, 20], [60, 20], [100, 60]];
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const runs = (ctx) => {
  const found = [];
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      found.push(run);
      run = 0;
    }
  }
  return found;
};

describe("the marks on the Letter Grid", () => {
  it("traces a word as a ribbon in the colour of the side tracing it, edged in ink, through the middle of each tile", () => {
    for (const side of [0, 1]) {
      const ctx = draw((pen) => drawTrace(pen, theme, POINTS, side, CELL));
      const strokes = colours(ctx);
      expect(strokes.indexOf(theme.ink), `${side}`).toBeLessThan(strokes.lastIndexOf(theme.sides[side].body));
      expect(ctx.calls.filter((call) => call.op === "arc")).toHaveLength(3);
      const area = bounds(painted(ctx));
      expect(area.left).toBeGreaterThan(20 - CELL * 0.2);
      expect(area.right).toBeLessThan(100 + CELL * 0.2);
      expect(ctx.depth).toBe(0);
    }
    expect(draw((pen) => drawTrace(pen, theme, [[20, 20]], 0, CELL)).calls.filter((call) => call.op === "arc")).toHaveLength(1);
    expect(draw((pen) => drawTrace(pen, theme, [], 0, CELL)).calls).toHaveLength(0);
  });

  it("links the tiles of the last word said with a dashed line", () => {
    const ctx = draw((pen) => drawLastWord(pen, theme, POINTS, CELL));
    expect(ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length)).toBe(true);
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThanOrEqual(20);
    expect(area.bottom).toBeLessThanOrEqual(60);
    expect(ctx.depth).toBe(0);
  });

  it("marks a word found with a short burst at its last tile, in the shape of the side's mark, only while it lasts", () => {
    for (const side of [0, 1]) {
      expect(draw((ctx) => drawWordBurst(ctx, theme, 100, 100, CELL, 0, side)).calls).toHaveLength(0);
      expect(draw((ctx) => drawWordBurst(ctx, theme, 100, 100, CELL, 1, side)).calls).toHaveLength(0);
      const middle = draw((ctx) => drawWordBurst(ctx, theme, 100, 100, CELL, 0.5, side));
      expect(within(middle, CELL)).toBe(true);
      expect(colours(middle)).toContain(theme.sides[side].body);
      expect(runs(middle).every((corners) => corners === (side === 0 ? 10 : 4))).toBe(true);
      expect(middle.depth).toBe(0);
    }
  });

  it("puts a small clock on a word that waits for the other phone, in its last tile's corner", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, CELL));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2)).toBe(true);
  });
});
