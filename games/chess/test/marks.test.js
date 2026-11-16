import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawCaptureRing, drawCaptureTarget, drawCastlePath, drawCheck, drawLastMove, drawLegalDot, drawPendingClock, drawSelection } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 40;
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc");
const strokes = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;
const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);

describe("the marks on the chess board", () => {
  it("shows where the chosen piece may go as a small dot, and a piece it may take as a ring with four ticks, each inside its square", () => {
    const dot = draw((ctx) => drawLegalDot(ctx, theme, 100, 100, CELL));
    expect(arcs(dot)).toHaveLength(1);
    expect(arcs(dot)[0].radius).toBeLessThan(CELL * 0.15);
    const take = draw((ctx) => drawCaptureTarget(ctx, theme, 100, 100, CELL));
    expect(arcs(take)).toHaveLength(1);
    expect(arcs(take)[0].radius).toBeGreaterThan(CELL * 0.3);
    expect(strokes(take)).toBe(5);
    expect(colours(take)).toContain(theme.marks.take);
    for (const ctx of [dot, take]) {
      expect(within(ctx, CELL / 2)).toBe(true);
      expect(ctx.depth).toBe(0);
    }
  });

  it("frames the chosen piece twice inside its square", () => {
    const ctx = draw((pen) => drawSelection(pen, theme, 100, 100, CELL));
    expect(within(ctx, CELL / 2)).toBe(true);
    expect(strokes(ctx)).toBe(2);
    expect(colours(ctx)).toEqual(expect.arrayContaining([theme.ink, theme.marks.chosen]));
  });

  it("marks the two squares of the last move by their corners, in another tone while the move waits for the other phone", () => {
    const done = draw((ctx) => drawLastMove(ctx, theme, 100, 100, CELL));
    const waiting = draw((ctx) => drawLastMove(ctx, theme, 100, 100, CELL, { pending: true }));
    expect(strokes(done)).toBe(8);
    expect(within(done, CELL / 2)).toBe(true);
    expect(colours(done)).toContain(theme.marks.chosen);
    expect(colours(waiting)).toContain(theme.marks.waiting);
    expect(colours(waiting)).not.toContain(theme.marks.chosen);
  });

  it("rings a king in check, without filling its square", () => {
    const ctx = draw((pen) => drawCheck(pen, theme, 100, 100, CELL));
    expect(arcs(ctx)).toHaveLength(1);
    expect(ctx.calls.some((call) => call.op === "fill" || call.op === "fillRect")).toBe(false);
    expect(within(ctx, CELL / 2)).toBe(true);
  });

  it("closes a ring on a piece taken, fading, only while it lasts", () => {
    expect(draw((ctx) => drawCaptureRing(ctx, theme, 100, 100, CELL, 0)).calls).toHaveLength(0);
    expect(draw((ctx) => drawCaptureRing(ctx, theme, 100, 100, CELL, 1)).calls).toHaveLength(0);
    const early = draw((ctx) => drawCaptureRing(ctx, theme, 100, 100, CELL, 0.2));
    const late = draw((ctx) => drawCaptureRing(ctx, theme, 100, 100, CELL, 0.8));
    expect(arcs(late)[0].radius).toBeLessThan(arcs(early)[0].radius);
    expect(Math.min(...alphas(late))).toBeLessThan(Math.min(...alphas(early)));
    expect(within(early, CELL / 2)).toBe(true);
  });

  it("draws the way a castling piece takes as a thin arrow that fades as it arrives", () => {
    const from = { x: 20, y: 100 };
    const to = { x: 100, y: 100 };
    const early = draw((ctx) => drawCastlePath(ctx, theme, from, to, CELL, 0.1));
    const area = bounds(painted(early));
    expect(area.left).toBeGreaterThanOrEqual(19);
    expect(area.right).toBeLessThanOrEqual(101);
    const late = draw((ctx) => drawCastlePath(ctx, theme, from, to, CELL, 0.9));
    expect(Math.min(...alphas(late))).toBeLessThan(Math.min(...alphas(early)));
    expect(draw((ctx) => drawCastlePath(ctx, theme, from, to, CELL, 1)).calls).toHaveLength(0);
  });

  it("puts a small clock on a move that waits for the other phone, in the square's corner", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, CELL));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2)).toBe(true);
  });
});
