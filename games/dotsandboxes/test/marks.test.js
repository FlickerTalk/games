import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawClaimBurst, drawExtraTurn, drawLastLine, drawOpenLine, drawPendingClock } from "../src/marks.js";
import { drawClaimedBox, strokeOf } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 60;
const within = (ctx, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= 100 - reach && area.right <= 100 + reach && area.top >= 100 - reach && area.bottom <= 100 + reach;
};
const count = (ctx, op) => ctx.calls.filter((call) => call.op === op).length;

describe("the marks on the dots and boxes board", () => {
  it("shows a line not yet drawn as a dashed track with a ring in its middle, darker while the user may draw it", () => {
    const open = draw((ctx) => drawOpenLine(ctx, theme, 100, 100, CELL, { open: true }));
    const shut = draw((ctx) => drawOpenLine(ctx, theme, 100, 100, CELL, { open: false }));
    const dashes = open.calls.filter((call) => call.op === "setLineDash").map((call) => call.segments.length);
    expect(dashes[0]).toBeGreaterThan(0);
    expect(dashes.at(-1)).toBe(0);
    expect(count(open, "arc")).toBe(1);
    expect(colours(open)).not.toEqual(colours(shut));
    expect(within(open, CELL / 2)).toBe(true);
    const upright = bounds(painted(draw((ctx) => drawOpenLine(ctx, theme, 100, 100, CELL, { horizontal: false }))));
    expect(upright.bottom - upright.top).toBeGreaterThan(upright.right - upright.left);
    expect(open.depth + shut.depth).toBe(0);
  });

  it("rings the last line drawn twice around its middle", () => {
    const ctx = draw((pen) => drawLastLine(pen, theme, 100, 100, CELL));
    expect(count(ctx, "arc")).toBe(2);
    expect(within(ctx, strokeOf(CELL) * 2.5)).toBe(true);
    expect(ctx.depth).toBe(0);
  });

  it("bursts a box as it is claimed only while the burst lasts, close to the box", () => {
    expect(draw((ctx) => drawClaimBurst(ctx, theme, 100, 100, CELL, 0, 0)).calls).toHaveLength(0);
    expect(draw((ctx) => drawClaimBurst(ctx, theme, 100, 100, CELL, 0, 1)).calls).toHaveLength(0);
    const middle = draw((ctx) => drawClaimBurst(ctx, theme, 100, 100, CELL, 1, 0.5));
    expect(count(middle, "stroke")).toBe(8);
    expect(within(middle, CELL * 0.7)).toBe(true);
    expect(middle.depth).toBe(0);
  });

  it("turns an arrow round a box whose closing gave its side another turn, growing in, inside the box", () => {
    expect(draw((ctx) => drawExtraTurn(ctx, theme, 100, 100, CELL, 0, 0)).calls).toHaveLength(0);
    const full = draw((ctx) => drawExtraTurn(ctx, theme, 100, 100, CELL, 0, 1));
    expect(count(full, "arc")).toBeGreaterThanOrEqual(1);
    expect(count(full, "closePath")).toBe(1);
    expect(within(full, CELL / 2)).toBe(true);
    const half = draw((ctx) => drawExtraTurn(ctx, theme, 100, 100, CELL, 0, 0.3));
    expect(within(half, CELL * 0.3)).toBe(true);
    expect(full.depth + half.depth).toBe(0);
  });

  it("turns that arrow clear of the cross in the box, with room for the strokes of both", () => {
    const cross = draw((ctx) => drawClaimedBox(ctx, theme, 100, 100, CELL * 0.88, 0));
    const reach = Math.max(...cross.calls.filter((call) => call.op === "moveTo" || call.op === "lineTo").map((call) => Math.hypot(call.points[0][0] - 100, call.points[0][1] - 100)).filter((distance) => distance < CELL * 0.3));
    const arrow = draw((ctx) => drawExtraTurn(ctx, theme, 100, 100, CELL, 0, 1));
    const radius = arrow.calls.find((call) => call.op === "arc").radius;
    expect(radius).toBeGreaterThanOrEqual(reach * 1.45);
  });

  it("puts a small clock on a line that waits for the other phone, over its middle", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, 8));
    expect(count(ctx, "arc")).toBe(1);
    expect(within(ctx, 8)).toBe(true);
    expect(ctx.depth).toBe(0);
  });
});
