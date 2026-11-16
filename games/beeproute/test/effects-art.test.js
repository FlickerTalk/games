import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawCollectBurst, drawConfetti, drawDustPuff, drawPopRing } from "../src/effects-art.js";
import { THEME } from "../src/theme.js";

const EFFECTS = [
  ["burst", (ctx, t) => drawCollectBurst(ctx, 100, 100, 50, t, THEME)],
  ["ring", (ctx, t) => drawPopRing(ctx, 100, 100, 50, t, THEME)],
  ["dust", (ctx, t) => drawDustPuff(ctx, 100, 100, 50, t, THEME)],
  ["confetti", (ctx, t) => drawConfetti(ctx, { x: 50, y: 50, w: 100, h: 100 }, t, 3, THEME)],
];

describe("the effects", () => {
  it("draw nothing before they start or once they are over", () => {
    for (const [name, effect] of EFFECTS) {
      expect(painted(draw((ctx) => effect(ctx, 0))), name).toEqual([]);
      expect(painted(draw((ctx) => effect(ctx, 1))), name).toEqual([]);
    }
  });

  it("change as they play, stay near where they happen, and leave the drawing state as they found it", () => {
    for (const [name, effect] of EFFECTS) {
      const early = draw((ctx) => effect(ctx, 0.2));
      const late = draw((ctx) => effect(ctx, 0.7));
      expect(shapes(early), name).not.toEqual(shapes(late));
      const box = bounds(painted(late));
      expect(box.left, name).toBeGreaterThan(0);
      expect(box.top, name).toBeGreaterThan(0);
      expect(box.right, name).toBeLessThan(220);
      expect(box.bottom, name).toBeLessThan(220);
      expect(late.depth, name).toBe(0);
    }
  });
});
