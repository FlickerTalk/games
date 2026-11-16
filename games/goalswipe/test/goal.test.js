import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBonusTarget, drawGoal } from "../src/goal.js";
import { THEME, themeFor } from "../src/theme.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";

const GOAL = { x: 46, y: 130, w: 292, h: 177 };
const goal = (options, theme = THEME) => draw((ctx) => drawGoal(ctx, GOAL, theme, options));

describe("the goal", () => {
  it("stands on its box with posts a little outside it and a net inside", () => {
    const ctx = goal({});
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(GOAL.x - 8);
    expect(box.right).toBeLessThanOrEqual(GOAL.x + GOAL.w + 8);
    expect(box.top).toBeGreaterThanOrEqual(GOAL.y - 1);
    expect(box.bottom).toBeLessThanOrEqual(GOAL.y + GOAL.h + 6);
    expect(ctx.calls.filter((call) => call.op === "quadraticCurveTo").length).toBeGreaterThan(12);
    expect(colours(ctx)).toContain(THEME.art.goal.post);
    expect(ctx.depth).toBe(0);
  });

  it("bulges its net where the ball went in, and hangs straight otherwise", () => {
    const flat = shapes(goal({ bulge: 0, at: { x: 0.2, y: 0.3 } }));
    const full = shapes(goal({ bulge: 1, at: { x: 0.2, y: 0.3 } }));
    expect(full).not.toEqual(flat);
    expect(shapes(goal({ bulge: 1, at: { x: 0.8, y: 0.3 } }))).not.toEqual(full);
  });

  it("gets a light rim around its dark outline on a dark page", () => {
    const dark = themeFor(tokensFor("mono-dark"), { dark: true });
    expect(colours(goal({}, dark))).toContain(dark.art.rim);
    expect(goal({}, dark).calls.length).toBeGreaterThan(goal({}).calls.length);
  });
});

describe("a bonus target", () => {
  const target = (kind, options = {}) => draw((ctx) => drawBonusTarget(ctx, 200, 170, 44, kind, THEME, { cord: 30, ...options }));

  it("is a tyre or a pair of bells, hanging on a cord from the bar", () => {
    expect(shapes(target("tyre"))).not.toEqual(shapes(target("bells")));
    for (const kind of ["tyre", "bells"]) {
      const box = bounds(painted(target(kind)));
      expect(box.top, kind).toBeLessThanOrEqual(170 - 30 - 10);
      expect(box.bottom, kind).toBeLessThanOrEqual(170 + 44 * 0.6);
      expect(Math.abs((box.left + box.right) / 2 - 200), kind).toBeLessThan(4);
      expect(target(kind).depth).toBe(0);
    }
  });

  it("sways gently and shakes when it is hit", () => {
    expect(shapes(target("tyre", { time: 0.2 }))).not.toEqual(shapes(target("tyre", { time: 0.6 })));
    expect(shapes(target("tyre", { time: 0.2, hit: 1 }))).not.toEqual(shapes(target("tyre", { time: 0.2 })));
  });
});
