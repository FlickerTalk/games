import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBellRing, drawBounceMarks, drawBurst, drawConfetti } from "../src/effects-art.js";
import { THEME } from "../src/theme.js";

const EFFECTS = [
  ["bell", (ctx, t) => drawBellRing(ctx, 200, 200, 100, t, THEME)],
  ["marks", (ctx, t) => drawBounceMarks(ctx, 200, 200, 100, t, THEME)],
  ["burst", (ctx, t) => drawBurst(ctx, 200, 200, 100, t, 3, THEME)],
  ["confetti", (ctx, t) => drawConfetti(ctx, { x: 100, y: 100, w: 200, h: 200 }, t, 5, THEME)],
];

describe("the effects", () => {
  it("draw nothing before they start or after they end, and something in between", () => {
    for (const [name, effect] of EFFECTS) {
      expect(draw((ctx) => effect(ctx, 0)).calls, name).toEqual([]);
      expect(draw((ctx) => effect(ctx, 1)).calls, name).toEqual([]);
      const ctx = draw((one) => effect(one, 0.4));
      expect(ctx.calls.length, name).toBeGreaterThan(5);
      expect(ctx.depth, name).toBe(0);
    }
  });

  it("grow with their progress and stay around where they happen, the bounce marks moving away from the golem", () => {
    const marks = (t) => bounds(painted(draw((ctx) => EFFECTS[1][1](ctx, t))));
    expect(marks(0.8).left).toBeLessThan(marks(0.15).left);
    for (const [name, effect] of [EFFECTS[0], EFFECTS[2]]) {
      const early = bounds(painted(draw((ctx) => effect(ctx, 0.15))));
      const late = bounds(painted(draw((ctx) => effect(ctx, 0.8))));
      expect(late.right - late.left, name).toBeGreaterThan(early.right - early.left);
      expect(late.left, name).toBeGreaterThan(200 - 220);
      expect(late.right, name).toBeLessThan(200 + 220);
    }
  });

  it("burst differently for each seed, the same for the same one", () => {
    const burst = (seed) => shapes(draw((ctx) => drawBurst(ctx, 200, 200, 100, 0.5, seed, THEME))).join("\n");
    expect(burst(1)).toBe(burst(1));
    expect(burst(1)).not.toBe(burst(2));
  });
});
