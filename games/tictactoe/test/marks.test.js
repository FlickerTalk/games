import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawLastMove, drawLegalTarget, drawMiss, drawPendingClock, drawPlacementBurst, drawWinRibbon } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 100;
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const dashed = (ctx) => ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length);
const corners = (ctx, count) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === count) found += 1;
      run = 0;
    }
  }
  return found;
};

describe("the marks on the Tic-Tac-Toe board", () => {
  it("shows a free cell the user may play as a dotted ring round a dot, in the colour of the user's side", () => {
    for (const side of [0, 1]) {
      const ctx = draw((pen) => drawLegalTarget(pen, theme, 100, 100, CELL, { side }));
      expect(ctx.calls.filter((call) => call.op === "arc")).toHaveLength(1);
      expect(ctx.calls.filter((call) => call.op === "ellipse")).toHaveLength(1);
      expect(dashed(ctx)).toBe(true);
      expect(colours(ctx)).toContain(theme.pieces[side].ring);
      expect(within(ctx, CELL * 0.3)).toBe(true);
      expect(ctx.depth).toBe(0);
    }
  });

  it("rings the last move with a dashed halo and a small diamond at its corner, inside the cell", () => {
    const ctx = draw((pen) => drawLastMove(pen, theme, 100, 100, CELL));
    expect(dashed(ctx)).toBe(true);
    expect(corners(ctx, 4)).toBe(1);
    expect(within(ctx, CELL / 2)).toBe(true);
    const diamond = ctx.calls.filter((call) => call.op === "lineTo").at(-1).points[0];
    expect(diamond[0]).toBeGreaterThan(100);
    expect(diamond[1]).toBeLessThan(100);
    expect(ctx.depth).toBe(0);
  });

  it("puts a small clock on a move that waits for the other phone, in the cell's corner", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, CELL));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2)).toBe(true);
  });

  it("bursts round a piece just placed, and shakes off a tap on a taken cell, only while they last", () => {
    for (const effect of [(ctx, p) => drawPlacementBurst(ctx, theme, 100, 100, CELL, p, 1), (ctx, p) => drawMiss(ctx, theme, 100, 100, CELL, p)]) {
      expect(draw((ctx) => effect(ctx, 0)).calls).toHaveLength(0);
      expect(draw((ctx) => effect(ctx, 1)).calls).toHaveLength(0);
      const middle = draw((ctx) => effect(ctx, 0.5));
      expect(middle.calls.length).toBeGreaterThan(0);
      expect(within(middle, CELL)).toBe(true);
      expect(middle.depth).toBe(0);
    }
    expect(colours(draw((ctx) => drawPlacementBurst(ctx, theme, 100, 100, CELL, 0.5, 0)))).toContain(theme.pieces[0].hue);
    expect(dashed(draw((ctx) => drawMiss(ctx, theme, 100, 100, CELL, 0.5)))).toBe(true);
  });

  it("draws the winning line as a ribbon in the winner's colour, from one end towards the other, its ends notched once it is drawn", () => {
    const from = { x: 20, y: 100 };
    const to = { x: 300, y: 100 };
    expect(draw((ctx) => drawWinRibbon(ctx, theme, from, to, 12, 0, 1)).calls).toHaveLength(0);
    const growing = draw((ctx) => drawWinRibbon(ctx, theme, from, to, 12, 0.3, 1));
    expect(bounds(painted(growing)).right).toBeLessThan(to.x);
    expect(corners(growing, 5)).toBe(0);
    expect(colours(growing)).toContain(theme.pieces[1].hue);
    const done = draw((ctx) => drawWinRibbon(ctx, theme, from, to, 12, 1, 0));
    expect(corners(done, 5)).toBe(2);
    expect(colours(done)).toContain(theme.pieces[0].hue);
    expect(done.depth).toBe(0);
  });
});
