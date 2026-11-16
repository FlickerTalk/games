import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBurst, drawConfetti, drawNotePop, drawPuff } from "../src/effects-art.js";
import { THEME } from "../src/theme.js";
import { wagonOf } from "../src/train.js";

const lines = (ctx) => shapes(ctx).join("\n");

describe("the effects", () => {
  it("pop a note out of a wagon in the wagon's own shape, rising as it goes and gone at the end", () => {
    const at = (progress, wagon = wagonOf(1)) => draw((ctx) => drawNotePop(ctx, 100, 200, 60, wagon, progress, THEME));
    expect(bounds(painted(at(0.6))).top).toBeLessThan(bounds(painted(at(0.2))).top);
    expect(lines(at(0.4, wagonOf(2)))).not.toBe(lines(at(0.4)));
    expect(painted(at(0))).toEqual([]);
    expect(painted(at(1))).toEqual([]);
    expect(at(0.5).depth).toBe(0);
  });

  it("burst around a wagon that fits, growing with time and sized to the wagon", () => {
    const wide = (progress, size = 60) => {
      const box = bounds(painted(draw((ctx) => drawBurst(ctx, 100, 100, size, progress, THEME))));
      return box.right - box.left;
    };
    expect(wide(0.7)).toBeGreaterThan(wide(0.2));
    expect(wide(0.5, 90)).toBeGreaterThan(wide(0.5, 60));
    expect(wide(0.9)).toBeLessThan(60 * 1.8);
    expect(painted(draw((ctx) => drawBurst(ctx, 100, 100, 60, 1, THEME)))).toEqual([]);
  });

  it("trail the engine's puff as a few small clouds behind its head", () => {
    const ctx = draw((pen) => drawPuff(pen, 200, 100, 40, 0.3, THEME));
    const box = bounds(painted(ctx));
    expect(ctx.calls.filter((call) => call.op === "ellipse")).toHaveLength(4);
    expect(box.right).toBeLessThanOrEqual(200 + 40 * 0.3);
    expect(box.left).toBeGreaterThan(200 - 40 * 2);
    expect(ctx.depth).toBe(0);
  });

  it("throw confetti over the round's card and clear it away", () => {
    const area = { x: 20, y: 80, w: 340, h: 600 };
    expect(painted(draw((ctx) => drawConfetti(ctx, area, 0.4, 5, THEME))).length).toBeGreaterThan(40);
    expect(painted(draw((ctx) => drawConfetti(ctx, area, 1, 5, THEME)))).toEqual([]);
  });
});
