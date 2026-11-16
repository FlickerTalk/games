import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawCaptureBurst, drawCrownSparkles, drawForcedHint, drawJumpArc, drawLastMove, drawLegalTarget, drawPendingClock, drawSelected } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 40;
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;
const strokesOf = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;

describe("the marks on the checkers board", () => {
  it("shows a step as a dot and a capture as rings with four ticks, each inside its square", () => {
    const step = draw((ctx) => drawLegalTarget(ctx, theme, 100, 100, CELL, { capture: false, time: 0 }));
    const capture = draw((ctx) => drawLegalTarget(ctx, theme, 100, 100, CELL, { capture: true, time: 0 }));
    expect(arcs(step)).toBe(1);
    expect(arcs(capture)).toBe(2);
    expect(strokesOf(capture)).toBeGreaterThanOrEqual(6);
    expect(within(step, CELL / 2)).toBe(true);
    expect(within(capture, CELL / 2)).toBe(true);
    expect(step.depth + capture.depth).toBe(0);
  });

  it("pulses its targets gently, never more than three times a second", () => {
    const radiusAt = (time) => draw((ctx) => drawLegalTarget(ctx, theme, 100, 100, CELL, { time })).calls.find((call) => call.op === "arc").radius;
    const samples = Array.from({ length: 101 }, (_, at) => radiusAt(at / 100));
    const peaks = samples.filter((value, at) => at > 0 && at < 100 && value > samples[at - 1] && value >= samples[at + 1]).length;
    expect(peaks).toBeLessThanOrEqual(3);
    expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples));
  });

  it("frames the chosen piece and marks a piece that must capture, both around their square", () => {
    expect(within(draw((ctx) => drawSelected(ctx, theme, 100, 100, CELL, 0)), CELL / 2 + 1)).toBe(true);
    const forced = draw((ctx) => drawForcedHint(ctx, theme, 100, 100, CELL, 0));
    expect(within(forced, CELL / 2 + CELL * 0.2)).toBe(true);
    expect(bounds(painted(forced)).bottom).toBeLessThan(100);
  });

  it("draws the last move as an arrow from where it started to where it ended", () => {
    const ctx = draw((pen) => drawLastMove(pen, theme, { x: 20, y: 140 }, { x: 140, y: 20 }, CELL));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(20);
    expect(area.right).toBeLessThan(150);
    expect(ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length)).toBe(true);
    expect(ctx.depth).toBe(0);
  });

  it("draws the arc of a jump above the line between its two squares, fading as the piece lands", () => {
    const early = draw((ctx) => drawJumpArc(ctx, theme, { x: 20, y: 100 }, { x: 100, y: 100 }, CELL, 0));
    const curve = early.calls.find((call) => call.op === "quadraticCurveTo");
    expect(curve.points[0][1]).toBeLessThan(100);
    const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    const late = draw((ctx) => drawJumpArc(ctx, theme, { x: 20, y: 100 }, { x: 100, y: 100 }, CELL, 0.9));
    expect(Math.min(...alphas(late))).toBeLessThan(Math.min(...alphas(early)));
  });

  it("bursts a captured piece and sparkles a new crown only while they last, close to their square", () => {
    for (const effect of [drawCaptureBurst, drawCrownSparkles]) {
      expect(draw((ctx) => effect(ctx, theme, 100, 100, CELL, 0)).calls).toHaveLength(0);
      expect(draw((ctx) => effect(ctx, theme, 100, 100, CELL, 1)).calls).toHaveLength(0);
      const middle = draw((ctx) => effect(ctx, theme, 100, 100, CELL, 0.5));
      expect(middle.calls.length).toBeGreaterThan(0);
      expect(within(middle, CELL)).toBe(true);
      expect(middle.depth).toBe(0);
    }
  });

  it("puts a small clock on a move that waits for the other phone, in the square's corner", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, CELL));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2)).toBe(true);
  });
});
