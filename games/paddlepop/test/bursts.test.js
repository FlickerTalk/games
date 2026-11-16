import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawConfetti, drawDragHand, drawGoalSplash, drawHitBurst, drawWideEffect } from "../src/bursts.js";
import { THEME } from "../src/theme.js";

const drawn = (ctx) => ctx.calls.some((call) => call.op === "stroke" || call.op === "fill");

describe("the answers to what happens on the table", () => {
  it("bursts where the ball is hit, sized to the hit, gone when done", () => {
    const small = bounds(painted(draw((pen) => drawHitBurst(pen, 100, 100, 20, 0.3, THEME))));
    const big = bounds(painted(draw((pen) => drawHitBurst(pen, 100, 100, 40, 0.3, THEME))));
    expect(big.right - big.left).toBeGreaterThan(small.right - small.left);
    expect(drawn(draw((pen) => drawHitBurst(pen, 100, 100, 40, 1, THEME)))).toBe(false);
  });

  it("splashes into the table from the goal line, rising and falling back", () => {
    const into = bounds(painted(draw((pen) => drawGoalSplash(pen, 200, 500, 160, 0.5, THEME))));
    expect(into.bottom).toBeLessThanOrEqual(515);
    expect(into.top).toBeLessThan(470);
    const flipped = bounds(painted(draw((pen) => drawGoalSplash(pen, 200, 100, 160, 0.5, THEME, { down: true }))));
    expect(flipped.top).toBeGreaterThanOrEqual(85);
    expect(drawn(draw((pen) => drawGoalSplash(pen, 200, 100, 160, 1, THEME)))).toBe(false);
  });

  it("throws confetti over the card, falling as it goes", () => {
    const early = bounds(painted(draw((pen) => drawConfetti(pen, { x: 0, y: 0, w: 300, h: 400 }, 0.1, THEME))));
    const late = bounds(painted(draw((pen) => drawConfetti(pen, { x: 0, y: 0, w: 300, h: 400 }, 0.9, THEME))));
    expect(late.bottom).toBeGreaterThan(early.bottom);
    expect(late.left).toBeGreaterThanOrEqual(-10);
    expect(late.right).toBeLessThanOrEqual(310);
  });

  it("shows the paddle's new reach with bars and stars at both its ends", () => {
    const area = bounds(painted(draw((pen) => drawWideEffect(pen, 200, 300, 160, THEME, 0))));
    expect(area.left).toBeLessThan(200 - 160 * 0.5);
    expect(area.right).toBeGreaterThan(200 + 160 * 0.5);
  });

  it("drags a hand across and back along the paddle's way, at the size asked", () => {
    const start = bounds(painted(draw((pen) => drawDragHand(pen, 100, 300, 60, 0, THEME))));
    const across = bounds(painted(draw((pen) => drawDragHand(pen, 100, 300, 60, 0.5, THEME))));
    expect(across.left - start.left).toBeCloseTo(75, 0);
    expect(across.right - across.left).toBeLessThan(60 * 1.6);
  });
});
