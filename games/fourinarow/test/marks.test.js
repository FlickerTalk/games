import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawColumnBracket, drawDropArrow, drawLandingBurst, drawLastMove, drawPendingClock, drawWinningLine } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const CELL = 40;
const area = (ctx) => bounds(painted(ctx));
const within = (ctx, reach) => {
  const box = area(ctx);
  return box.left >= 100 - reach && box.right <= 100 + reach && box.top >= 100 - reach && box.bottom <= 100 + reach;
};
const fills = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle").map((call) => call.value);
const dashed = (ctx) => ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length);

describe("the marks on the Four in a Row board", () => {
  it("points an arrow down into each column that has room, larger and in the app's accent over the one being played", () => {
    const open = draw((ctx) => drawDropArrow(ctx, theme, 100, 100, CELL));
    const chosen = draw((ctx) => drawDropArrow(ctx, theme, 100, 100, CELL, { chosen: true }));
    expect(area(open).bottom).toBeCloseTo(100, 6);
    expect(area(open).top).toBeLessThan(100);
    expect(area(chosen).right - area(chosen).left).toBeGreaterThan(area(open).right - area(open).left);
    expect(fills(open)).toEqual([theme.ui.muted]);
    expect(fills(chosen)).toEqual([theme.ui.accent]);
    expect(open.depth + chosen.depth).toBe(0);
  });

  it("frames the column being played with a dashed outline in the app's accent", () => {
    const column = { x: 80, y: 20, w: CELL, h: 260 };
    const ctx = draw((pen) => drawColumnBracket(pen, theme, column, CELL, 0));
    const box = area(ctx);
    expect(box.left).toBeGreaterThanOrEqual(column.x);
    expect(box.right).toBeLessThanOrEqual(column.x + column.w);
    expect(box.top).toBeCloseTo(column.y, 6);
    expect(box.bottom).toBeCloseTo(column.y + column.h, 6);
    expect(dashed(ctx)).toBe(true);
    expect(ctx.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value)).toEqual([theme.ui.accent]);
    expect(ctx.depth).toBe(0);
  });

  it("rings the last disc dropped with a dashed circle and a spark, inside its cell", () => {
    const ctx = draw((pen) => drawLastMove(pen, theme, 100, 100, CELL * 0.39));
    expect(dashed(ctx)).toBe(true);
    expect(within(ctx, CELL / 2)).toBe(true);
    expect(ctx.depth).toBe(0);
  });

  it("bursts round a disc as it lands only while the burst lasts, close to its hole", () => {
    expect(draw((ctx) => drawLandingBurst(ctx, theme, 100, 100, 16, 0, 0)).calls).toHaveLength(0);
    expect(draw((ctx) => drawLandingBurst(ctx, theme, 100, 100, 16, 1, 1)).calls).toHaveLength(0);
    const middle = draw((ctx) => drawLandingBurst(ctx, theme, 100, 100, 16, 0.5, 1));
    expect(middle.calls.length).toBeGreaterThan(0);
    expect(within(middle, CELL)).toBe(true);
    expect(middle.depth).toBe(0);
  });

  it("joins each winning four with a bright line through their centres, in one stroke, brighter as it glows", () => {
    const fours = [
      [{ x: 20, y: 100 }, { x: 140, y: 100 }],
      [{ x: 60, y: 20 }, { x: 60, y: 140 }],
    ];
    const alpha = (glow) => draw((ctx) => drawWinningLine(ctx, theme, fours, CELL, glow)).calls.find((call) => call.op === "set" && call.name === "globalAlpha").value;
    const ctx = draw((pen) => drawWinningLine(pen, theme, fours, CELL, 0));
    expect(ctx.calls.filter((call) => call.op === "moveTo")).toHaveLength(2);
    expect(ctx.calls.filter((call) => call.op === "lineTo")).toHaveLength(2);
    expect(ctx.calls.filter((call) => call.op === "stroke")).toHaveLength(1);
    expect(area(ctx)).toEqual({ left: 20, right: 140, top: 20, bottom: 140 });
    expect(alpha(1)).toBeGreaterThan(alpha(0));
    expect(alpha(-1)).toBeLessThan(alpha(0));
    expect(alpha(1)).toBeLessThanOrEqual(1);
    expect(ctx.depth).toBe(0);
  });

  it("puts a small clock on a disc that waits for the other phone, in its cell's corner", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, CELL));
    const box = area(ctx);
    expect(box.left).toBeGreaterThan(100);
    expect(box.bottom).toBeLessThan(100);
    expect(within(ctx, CELL / 2)).toBe(true);
  });
});
