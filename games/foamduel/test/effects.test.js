import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawConfetti, drawDust, drawPop, drawSwoosh } from "../src/effects.js";
import { THEME } from "../src/theme.js";

const area = (ctx) => bounds(painted(ctx));
const EACH = [
  ["swoosh", (pen, progress) => drawSwoosh(pen, 100, 100, 90, progress, THEME, { facing: 1, shape: "broad" }), 90],
  ["pop", (pen, progress) => drawPop(pen, 100, 100, 60, progress, THEME, "mine"), 60],
  ["dust", (pen, progress) => drawDust(pen, 100, 100, 60, progress, THEME), 60],
];

describe("the effects of an exchange", () => {
  it("draw nothing before they start or once they are over, and stay around their place in between", () => {
    for (const [name, effect, size] of EACH) {
      expect(painted(draw((pen) => effect(pen, 0))), name).toEqual([]);
      expect(painted(draw((pen) => effect(pen, 1))), name).toEqual([]);
      const ctx = draw((pen) => effect(pen, 0.5));
      const box = area(ctx);
      expect(ctx.depth, name).toBe(0);
      expect(box.left, name).toBeGreaterThanOrEqual(100 - size);
      expect(box.right, name).toBeLessThanOrEqual(100 + size);
      expect(box.top, name).toBeGreaterThanOrEqual(100 - size);
      expect(box.bottom, name).toBeLessThanOrEqual(100 + size);
    }
  });

  it("sweeps the sword's trail further as the strike goes", () => {
    const sweep = (progress) => {
      const arcs = draw((pen) => drawSwoosh(pen, 100, 100, 90, progress, THEME, { facing: -1, shape: "broad" })).calls.filter((call) => call.op === "arc");
      return Math.max(...arcs.map((call) => call.to - call.from));
    };
    expect(sweep(0.8)).toBeGreaterThan(sweep(0.2) * 2);
  });

  it("throws a pop's pieces further as it goes", () => {
    const wide = (progress) => {
      const box = area(draw((pen) => drawPop(pen, 100, 100, 60, progress, THEME, "theirs")));
      return box.right - box.left;
    };
    expect(wide(0.7)).toBeGreaterThan(wide(0.15));
  });

  it("rains confetti inside its area", () => {
    const zone = { x: 20, y: 30, w: 300, h: 400 };
    const ctx = draw((pen) => drawConfetti(pen, zone, 0.4, THEME));
    const box = area(ctx);
    expect(ctx.depth).toBe(0);
    expect(box.left).toBeGreaterThanOrEqual(zone.x - 12);
    expect(box.right).toBeLessThanOrEqual(zone.x + zone.w + 12);
    expect(box.top).toBeGreaterThanOrEqual(zone.y - 60);
    expect(painted(draw((pen) => drawConfetti(pen, zone, 1, THEME)))).toEqual([]);
  });
});
