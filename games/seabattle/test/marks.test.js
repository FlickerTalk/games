import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawAim, drawFoundBurst, drawHit, drawLastShot, drawMiss, drawOpenDot, drawPendingClock } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 30;
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;

describe("the marks on the sea", () => {
  it("draws a miss as a ring of water inside its cell, with drops flying out only while it splashes", () => {
    const rest = draw((ctx) => drawMiss(ctx, theme, 100, 100, CELL));
    expect(colours(rest)).toContain(theme.marks.miss);
    expect(within(rest, CELL / 2)).toBe(true);
    expect(rest.calls.filter((call) => call.op === "ellipse")).toHaveLength(0);
    const splashing = draw((ctx) => drawMiss(ctx, theme, 100, 100, CELL, 0.5));
    expect(splashing.calls.filter((call) => call.op === "ellipse")).toHaveLength(6);
    expect(within(splashing, CELL * 0.6)).toBe(true);
    expect(rest.depth + splashing.depth).toBe(0);
  });

  it("draws a hit as a splash of paint with a light cross, growing in as it lands", () => {
    const rest = draw((ctx) => drawHit(ctx, theme, 100, 100, CELL));
    expect(colours(rest)).toEqual(expect.arrayContaining([theme.marks.paint, theme.marks.white]));
    expect(within(rest, CELL / 2)).toBe(true);
    const width = (progress) => {
      const area = bounds(painted(draw((ctx) => drawHit(ctx, theme, 100, 100, CELL, progress))));
      return area.right - area.left;
    };
    expect(width(0)).toBeLessThan(width(1));
    expect(rest.depth).toBe(0);
  });

  it("aims at the chosen cell with a target at least as wide as a finger, pulsing gently", () => {
    const aim = draw((ctx) => drawAim(ctx, theme, 100, 100, 52, 0));
    const area = bounds(painted(aim));
    expect(area.right - area.left).toBeGreaterThanOrEqual(44);
    expect(within(aim, 52 / 2 + 3)).toBe(true);
    expect(colours(aim)).toContain(theme.marks.flag);
    const radiusAt = (time) => draw((ctx) => drawAim(ctx, theme, 100, 100, 52, time)).calls.find((call) => call.op === "arc").radius;
    const samples = Array.from({ length: 101 }, (_, at) => radiusAt(at / 100));
    const peaks = samples.filter((value, at) => at > 0 && at < 100 && value > samples[at - 1] && value >= samples[at + 1]).length;
    expect(peaks).toBeLessThanOrEqual(3);
    expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples));
  });

  it("rings the last shot with four dots, and dots the cells still open to a shot, each inside its cell", () => {
    const last = draw((ctx) => drawLastShot(ctx, theme, 100, 100, CELL));
    expect(arcs(last)).toBe(5);
    expect(within(last, CELL / 2 + 2)).toBe(true);
    const dot = draw((ctx) => drawOpenDot(ctx, theme, 100, 100, CELL));
    expect(arcs(dot)).toBe(1);
    expect(within(dot, CELL / 4)).toBe(true);
  });

  it("bursts stars around a boat that was found only while the burst lasts", () => {
    expect(draw((ctx) => drawFoundBurst(ctx, theme, 100, 100, CELL, 0)).calls).toHaveLength(0);
    expect(draw((ctx) => drawFoundBurst(ctx, theme, 100, 100, CELL, 1)).calls).toHaveLength(0);
    const middle = draw((ctx) => drawFoundBurst(ctx, theme, 100, 100, CELL, 0.5));
    expect(middle.calls.length).toBeGreaterThan(0);
    expect(within(middle, CELL * 1.5)).toBe(true);
    expect(middle.depth).toBe(0);
  });

  it("puts a small clock on a shot that waits for the other phone, in the cell's corner", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, CELL));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2 + 1)).toBe(true);
  });
});
