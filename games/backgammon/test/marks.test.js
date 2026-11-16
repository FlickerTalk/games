import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawHitRing, drawLastMove, drawOffTarget, drawPendingClock, drawSelection, drawSourceDot, drawTarget } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const R = 12;
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc");
const peaksOf = (samples) => samples.filter((value, at) => at > 0 && at < samples.length - 1 && value > samples[at - 1] && value >= samples[at + 1]).length;

describe("the marks on the backgammon table", () => {
  it("shows where a checker may go as a small dot, and a hit as a ring round the lone checker there", () => {
    const step = draw((ctx) => drawTarget(ctx, theme, 100, 100, R, { time: 0 }));
    const hit = draw((ctx) => drawTarget(ctx, theme, 100, 100, R, { hit: true, time: 0 }));
    expect(arcs(step)).toHaveLength(1);
    expect(arcs(step)[0].radius).toBeLessThan(R * 0.5);
    expect(arcs(hit)).toHaveLength(2);
    expect(Math.max(...arcs(hit).map((one) => one.radius))).toBeGreaterThan(R);
    expect(within(step, R)).toBe(true);
    expect(within(hit, R * 1.4)).toBe(true);
    expect(step.depth + hit.depth).toBe(0);
  });

  it("points the way off the table with a thin arrow inside the tray", () => {
    const ctx = draw((pen) => drawOffTarget(pen, theme, 100, 100, R, 0));
    expect(within(ctx, R * 1.2)).toBe(true);
    expect(ctx.calls.some((call) => call.op === "closePath")).toBe(true);
  });

  it("marks a checker that may move with a dot, and rings the chosen one, both around the checker", () => {
    expect(within(draw((ctx) => drawSourceDot(ctx, theme, 100, 100, R, 0)), R * 0.5)).toBe(true);
    const ring = draw((ctx) => drawSelection(ctx, theme, 100, 100, R, 0));
    expect(Math.min(...arcs(ring).map((one) => one.radius))).toBeGreaterThan(R);
    expect(within(ring, R * 1.6)).toBe(true);
  });

  it("pulses quietly, never more than three times a second", () => {
    const sample = (paint) => Array.from({ length: 101 }, (_, at) => arcs(draw((ctx) => paint(ctx, at / 100)))[0].radius);
    for (const paint of [(ctx, time) => drawSelection(ctx, theme, 100, 100, R, time), (ctx, time) => drawSourceDot(ctx, theme, 100, 100, R, time)]) {
      const radii = sample(paint);
      expect(peaksOf(radii)).toBeLessThanOrEqual(3);
      expect(Math.max(...radii)).toBeGreaterThan(Math.min(...radii));
    }
  });

  it("draws the last move as a thin line from where it started to an arrow where it ended", () => {
    const ctx = draw((pen) => drawLastMove(pen, theme, { x: 20, y: 140 }, { x: 140, y: 20 }, R));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThanOrEqual(20 - R * 0.4);
    expect(area.right).toBeLessThanOrEqual(140 + 1);
    expect(ctx.calls.some((call) => call.op === "closePath")).toBe(true);
    const alphas = ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    expect(Math.min(...alphas)).toBeLessThan(1);
    expect(ctx.depth).toBe(0);
  });

  it("closes one ring round a hit checker only while the hit lasts", () => {
    expect(draw((ctx) => drawHitRing(ctx, theme, 100, 100, R, 0)).calls).toHaveLength(0);
    expect(draw((ctx) => drawHitRing(ctx, theme, 100, 100, R, 1)).calls).toHaveLength(0);
    const early = arcs(draw((ctx) => drawHitRing(ctx, theme, 100, 100, R, 0.2)))[0].radius;
    const late = arcs(draw((ctx) => drawHitRing(ctx, theme, 100, 100, R, 0.8)))[0].radius;
    expect(late).toBeLessThan(early);
    expect(within(draw((ctx) => drawHitRing(ctx, theme, 100, 100, R, 0.1)), R * 2.2)).toBe(true);
  });

  it("puts a small clock beside a move that waits for the other phone", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, R));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.bottom).toBeLessThan(100);
    expect(within(ctx, R * 1.6)).toBe(true);
  });
});
