import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawFlipSpark, drawLastMarker, drawLegalRing, drawPassBadge, drawPendingClock } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 40;
const R = CELL * 0.39;
const within = (ctx, reach, [x, y] = [100, 100]) => {
  const area = bounds(painted(ctx));
  return area.left >= x - reach && area.right <= x + reach && area.top >= y - reach && area.bottom <= y + reach;
};
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc");
const strokes = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;
const peaks = (samples) => samples.filter((value, at) => at > 0 && at < samples.length - 1 && value > samples[at - 1] && value >= samples[at + 1]).length;

describe("the marks on the Reversi board", () => {
  it("rings a cell the user may play, with a dot in its middle and four ticks, inside the cell", () => {
    const ring = draw((ctx) => drawLegalRing(ctx, theme, 100, 100, R, 0));
    expect(arcs(ring)).toHaveLength(2);
    expect(strokes(ring)).toBeGreaterThanOrEqual(5);
    expect(within(ring, CELL / 2)).toBe(true);
    expect(ring.depth).toBe(0);
  });

  it("breathes its rings gently, never more than three times a second", () => {
    const radiusAt = (time) => arcs(draw((ctx) => drawLegalRing(ctx, theme, 100, 100, R, time)))[0].radius;
    const samples = Array.from({ length: 101 }, (_, at) => radiusAt(at / 100));
    expect(peaks(samples)).toBeLessThanOrEqual(3);
    expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples));
  });

  it("marks the last disc placed with a ring on it and a star at its corner, inside the cell", () => {
    const ctx = draw((pen) => drawLastMarker(pen, theme, 100, 100, R));
    expect(arcs(ctx).some((call) => call.radius < R && call.radius > R * 0.8)).toBe(true);
    expect(ctx.calls.filter((call) => call.op === "closePath").length).toBeGreaterThanOrEqual(1);
    const star = bounds(painted(ctx).slice(-10));
    expect(star.left).toBeGreaterThan(100);
    expect(star.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2)).toBe(true);
    expect(ctx.depth).toBe(0);
  });

  it("sparks a turned disc only while the spark lasts, with four short strokes close to its cell", () => {
    expect(draw((ctx) => drawFlipSpark(ctx, theme, 100, 100, R, 0)).calls).toHaveLength(0);
    expect(draw((ctx) => drawFlipSpark(ctx, theme, 100, 100, R, 1)).calls).toHaveLength(0);
    const middle = draw((ctx) => drawFlipSpark(ctx, theme, 100, 100, R, 0.5));
    expect(strokes(middle)).toBe(4);
    expect(within(middle, CELL)).toBe(true);
    expect(middle.depth).toBe(0);
  });

  it("puts a small clock on a disc that waits for the other phone, in the cell's corner", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, CELL));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2)).toBe(true);
  });
});

describe("the sign of a side that passes", () => {
  const dark = themeFor(tokensFor("mono-dark"), { dark: true });
  const badge = (options, look = theme) => draw((ctx) => drawPassBadge(ctx, look, 200, 200, 220, 1, options));

  it("is a card in the app's colours with the passing side's disc, a turning arrow and the same disc waiting", () => {
    for (const look of [theme, dark]) {
      const ctx = badge({ time: 0 }, look);
      expect(colours(ctx)).toContain(look.ui.surface);
      expect(colours(ctx)).toContain(look.ui.text);
      expect(colours(ctx).filter((colour) => colour === look.pieces[1].body)).toHaveLength(2);
      expect(colours(ctx)).not.toContain(look.pieces[0].body);
      expect(within(ctx, 112, [200, 200])).toBe(true);
      expect(ctx.depth).toBe(0);
    }
  });

  it("fades in and out, and its arrow bobs no more than three times a second", () => {
    expect(badge({ alpha: 0 }).calls).toHaveLength(0);
    const topAt = (time) => {
      const ctx = badge({ time });
      return Math.min(...ctx.calls.filter((call) => call.op === "arc" && call.from !== 0).map((call) => call.points[1][1]));
    };
    const samples = Array.from({ length: 101 }, (_, at) => topAt(at / 100));
    expect(peaks(samples)).toBeLessThanOrEqual(3);
    expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples));
  });
});
