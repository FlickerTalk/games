import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawBurst, drawConfetti, drawDust, drawMiss, drawSplash, drawZoom } from "../src/effects-art.js";
import { themeFor } from "../src/theme.js";

const THEME = themeFor(tokensFor("ember-dark"));
const EFFECTS = { drawBurst, drawDust, drawMiss, drawSplash, drawZoom };

describe("the effects", () => {
  it("draw around the point they are given, grow with their progress and leave the context as it was", () => {
    for (const [name, effect] of Object.entries(EFFECTS)) {
      const early = draw((pen) => effect(pen, 200, 200, 60, 0.1, THEME));
      const late = draw((pen) => effect(pen, 200, 200, 60, 0.7, THEME));
      for (const ctx of [early, late]) {
        const box = bounds(painted(ctx));
        expect(box.left, name).toBeGreaterThanOrEqual(120);
        expect(box.right, name).toBeLessThanOrEqual(280);
        expect(box.top, name).toBeGreaterThanOrEqual(120);
        expect(box.bottom, name).toBeLessThanOrEqual(280);
        expect(ctx.depth, name).toBe(0);
        expect(ctx.calls.some((call) => call.op === "fillText"), name).toBe(false);
      }
      expect(JSON.stringify(early.calls), name).not.toBe(JSON.stringify(late.calls));
    }
  });

  it("drop confetti inside the area, the same pieces for the same seed", () => {
    const area = { x: 20, y: 40, w: 300, h: 400 };
    const one = draw((pen) => drawConfetti(pen, area, 0.4, 5, THEME));
    const two = draw((pen) => drawConfetti(pen, area, 0.4, 5, THEME));
    expect(JSON.stringify(one.calls)).toBe(JSON.stringify(two.calls));
    const box = bounds(painted(one));
    expect(box.left).toBeGreaterThanOrEqual(area.x - 10);
    expect(box.right).toBeLessThanOrEqual(area.x + area.w + 10);
    expect(one.calls.length).toBeGreaterThan(100);
  });
});
