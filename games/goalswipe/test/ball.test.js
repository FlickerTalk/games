import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { FAR_SCALE, depthScale, drawBall, drawBallTrail } from "../src/ball.js";
import { BALLS } from "../src/levels.js";
import { THEME } from "../src/theme.js";

const ball = (variant, options) => draw((ctx) => drawBall(ctx, 100, 100, 40, variant, THEME, options));

describe("the ball", () => {
  it("has three looks, each as wide as asked around its centre", () => {
    expect(new Set(BALLS.map((variant) => shapes(ball(variant)).join("\n"))).size).toBe(3);
    for (const variant of BALLS) {
      const box = bounds(painted(ball(variant)));
      expect(box.right - box.left, variant).toBeCloseTo(40, 0);
      expect((box.left + box.right) / 2, variant).toBeCloseTo(100, 0);
      expect(ball(variant).depth).toBe(0);
    }
  });

  it("turns as it flies and falls back on the classic look", () => {
    expect(shapes(ball("classic", { rotation: 1 }))).not.toEqual(shapes(ball("classic")));
    expect(shapes(ball("unknown"))).toEqual(shapes(ball("classic")));
  });

  it("looks smaller the further it is, down to about half at the goal", () => {
    expect(depthScale(0)).toBe(1);
    expect(depthScale(1)).toBe(FAR_SCALE);
    expect(depthScale(4)).toBe(FAR_SCALE);
    expect(depthScale(0.5)).toBeGreaterThan(FAR_SCALE);
  });

  it("leaves a trail that fades towards where it came from", () => {
    const ctx = draw((pen) => drawBallTrail(pen, [[0, 0], [10, 0], [20, 0]], 24, THEME));
    const alphas = ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    expect(alphas).toEqual([...alphas].sort((one, two) => one - two));
    expect(alphas.at(-1)).toBeLessThan(0.5);
    expect(draw((pen) => drawBallTrail(pen, [[0, 0]], 24, THEME)).calls).toHaveLength(0);
  });
});
