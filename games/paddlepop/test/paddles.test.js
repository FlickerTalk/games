import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { PADDLES } from "../src/levels.js";
import { drawPaddle, drawWrappedPaddle, paddleDepth } from "../src/paddles.js";
import { THEME, themeFor } from "../src/theme.js";

const strokes = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;

describe("the paddles", () => {
  it("draws each of the six around its centre, about as wide as asked and a third as deep", () => {
    for (const kind of PADDLES) {
      for (const width of [60, 140, 260]) {
        const ctx = draw((pen) => drawPaddle(pen, kind, 200, 300, width, THEME));
        const area = bounds(painted(ctx));
        expect(area.left, `${kind} ${width}`).toBeGreaterThanOrEqual(200 - width * 0.6);
        expect(area.right, `${kind} ${width}`).toBeLessThanOrEqual(200 + width * 0.6);
        expect(area.right - area.left, `${kind} ${width}`).toBeGreaterThan(width * 0.8);
        expect(area.bottom - area.top, `${kind} ${width}`).toBeLessThanOrEqual(paddleDepth(kind, width) * 1.25);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("grows bars and stars at both ends while wide, and flattens for a moment when hit", () => {
    const plain = bounds(painted(draw((pen) => drawPaddle(pen, "cat", 200, 300, 140, THEME))));
    const wide = bounds(painted(draw((pen) => drawPaddle(pen, "cat", 200, 300, 140, THEME, { wide: true }))));
    expect(wide.right - wide.left).toBeGreaterThan(plain.right - plain.left + 20);
    const hit = bounds(painted(draw((pen) => drawPaddle(pen, "cat", 200, 300, 140, THEME, { squash: 1 }))));
    expect(hit.bottom - hit.top).toBeLessThan(plain.bottom - plain.top);
  });

  it("faces the other way at the far end of the table", () => {
    const near = bounds(painted(draw((pen) => drawPaddle(pen, "rocket", 200, 300, 140, THEME))));
    const far = bounds(painted(draw((pen) => drawPaddle(pen, "rocket", 200, 300, 140, THEME, { rotation: Math.PI }))));
    expect(far.left).toBeCloseTo(400 - near.right, 0);
    expect(far.top).toBeCloseTo(600 - near.bottom, 0);
  });

  it("draws an unknown look as the first paddle instead of failing", () => {
    expect(() => draw((pen) => drawPaddle(pen, "<nope>", 100, 100, 120, THEME))).not.toThrow();
  });

  it("gets a light rim around its dark outlines on a dark page only", () => {
    const dark = themeFor(tokensFor("mono-dark"), { dark: true });
    const light = themeFor(tokensFor("mono-light"), { dark: false });
    expect(strokes(draw((pen) => drawPaddle(pen, "log", 100, 100, 140, dark)))).toBeGreaterThan(strokes(draw((pen) => drawPaddle(pen, "log", 100, 100, 140, light))));
  });

  it("wraps the gift paddles as a present of the size asked", () => {
    for (const kind of ["caterpillar", "cloud"]) {
      const area = bounds(painted(draw((pen) => drawWrappedPaddle(pen, kind, 100, 100, 80, THEME, 0))));
      expect(area.right - area.left).toBeLessThanOrEqual(80);
      expect(area.bottom - area.top).toBeLessThanOrEqual(80 * 1.1);
    }
  });
});
