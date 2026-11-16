import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawLastMove, drawMiss, drawPendingClock, drawPlacementPop, drawTarget, drawWinningLine } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const R = 10;
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const dashed = (ctx) => ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length);
const triangles = (ctx) => {
  const found = [];
  let run = [];
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = [...call.points];
    else if (call.op === "lineTo" && run.length) run.push(...call.points);
    else if (call.op === "closePath") {
      if (run.length === 3) found.push(run);
      run = [];
    }
  }
  return found;
};
const strokeColours = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);

describe("the marks on the Five in a Row board", () => {
  it("rings the last stone with a dashed ring and points at it from above", () => {
    const ctx = draw((pen) => drawLastMove(pen, theme, 100, 100, R));
    expect(dashed(ctx)).toBe(true);
    expect(ctx.calls.find((call) => call.op === "arc").radius).toBeCloseTo(R * 1.35, 6);
    const [arrow] = triangles(ctx);
    expect(Math.max(...arrow.map(([, y]) => y))).toBeLessThan(100 - R);
    expect(strokeColours(ctx)).toContain(theme.marks.last);
    expect(within(ctx, R * 2)).toBe(true);
    expect(ctx.depth).toBe(0);
  });

  it("rings the chosen crossing with a dashed target that breathes gently, never more than three times a second", () => {
    const radiusAt = (time) => draw((ctx) => drawTarget(ctx, theme, 100, 100, R, time)).calls.find((call) => call.op === "arc").radius;
    const samples = Array.from({ length: 101 }, (_, at) => radiusAt(at / 100));
    const peaks = samples.filter((value, at) => at > 0 && at < 100 && value > samples[at - 1] && value >= samples[at + 1]).length;
    expect(peaks).toBeLessThanOrEqual(3);
    expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples));
    expect(dashed(draw((ctx) => drawTarget(ctx, theme, 100, 100, R, 0)))).toBe(true);
  });

  it("pops a stone just placed and shakes off a tap on a taken crossing, only while they last, close to the crossing", () => {
    for (const effect of [drawPlacementPop, drawMiss]) {
      expect(draw((ctx) => effect(ctx, theme, 100, 100, R, 1)).calls).toHaveLength(0);
      expect(draw((ctx) => effect(ctx, theme, 100, 100, R, -0.1)).calls).toHaveLength(0);
      const middle = draw((ctx) => effect(ctx, theme, 100, 100, R, 0.5));
      expect(middle.calls.length).toBeGreaterThan(0);
      expect(within(middle, R * 3.6)).toBe(true);
      expect(middle.depth).toBe(0);
    }
    expect(strokeColours(draw((ctx) => drawMiss(ctx, theme, 100, 100, R, 0.2)))).toContain(theme.marks.miss);
  });

  it("joins the winning five with a line that grows from the first stone to the last, a sparkle at each end", () => {
    const points = [{ x: 20, y: 20 }, { x: 40, y: 40 }, { x: 60, y: 60 }, { x: 80, y: 80 }, { x: 100, y: 100 }];
    const strokesTo = (ctx) => ctx.calls.filter((call) => call.op === "lineTo").map((call) => call.points[0]);
    const half = draw((ctx) => drawWinningLine(ctx, theme, points, { progress: 0.5, width: 8 }));
    expect(strokesTo(half)[0][0]).toBeCloseTo(60, 6);
    const full = draw((ctx) => drawWinningLine(ctx, theme, points, { progress: 1, width: 8 }));
    expect(strokesTo(full)[0][0]).toBeCloseTo(100, 6);
    expect(strokeColours(full)).toEqual(expect.arrayContaining([theme.ink, theme.marks.gold]));
    expect(full.calls.filter((call) => call.op === "closePath")).toHaveLength(2);
    expect(draw((ctx) => drawWinningLine(ctx, theme, points.slice(0, 1), { progress: 1, width: 8 })).calls).toHaveLength(0);
    expect(full.depth).toBe(0);
  });

  it("keeps the sparkles of a five along the top row on the board", () => {
    const top = [{ x: 20, y: 12 }, { x: 100, y: 12 }];
    expect(bounds(painted(draw((ctx) => drawWinningLine(ctx, theme, top, { progress: 1, width: 8, top: 2 })))).top).toBeGreaterThanOrEqual(2);
  });

  it("puts a small clock on a stone that waits for the other phone, in the corner of its crossing", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, 24));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, 12)).toBe(true);
  });
});
