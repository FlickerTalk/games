import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawAimRing, drawConfetti, drawCork, drawSteerHint, drawWrapMarker } from "../src/effects.js";
import { THEME } from "../src/theme.js";

const wide = (ctx) => {
  const { left, right } = bounds(painted(ctx));
  return right - left;
};

describe("the effects", () => {
  it("closes the aim ring as the hunter stays on the tail, and colours it when it shuts", () => {
    const at = (progress) => draw((pen) => drawAimRing(pen, 200, 200, 40, progress, THEME, 0));
    expect(wide(at(0.9))).toBeLessThan(wide(at(0.1)));
    expect(colours(at(0.5))).toContain(THEME.art.effects.ring);
    expect(colours(at(1))).toContain(THEME.art.effects.shut);
    expect(at(0).calls).toHaveLength(0);
    expect(at(0.5).depth).toBe(0);
  });

  it("flies the cork from the hunter to the balloon it pops, with its trail behind", () => {
    const at = (progress) => bounds(painted(draw((pen) => drawCork(pen, [100, 300], [100, 100], 16, progress, THEME))));
    expect(at(0.2).top).toBeGreaterThan(at(0.8).top);
    expect(at(0.8).top).toBeGreaterThan(80);
    expect(draw((pen) => drawCork(pen, [100, 300], [100, 100], 16, 1, THEME)).calls).toHaveLength(0);
    expect(colours(draw((pen) => drawCork(pen, [100, 300], [100, 100], 16, 0.5, THEME)))).toContain(THEME.art.effects.cork);
  });

  it("marks the edge an aircraft is about to leave by, pointing out of the sky", () => {
    for (const way of ["left", "right", "up", "down"]) {
      const ctx = draw((pen) => drawWrapMarker(pen, 200, 200, 30, way, THEME, 1));
      expect(ctx.calls.length, way).toBeGreaterThan(8);
      expect(ctx.depth, way).toBe(0);
    }
    const [left, right] = ["left", "right"].map((way) => bounds(painted(draw((pen) => drawWrapMarker(pen, 200, 200, 30, way, THEME, 1)))));
    expect(200 - left.left).toBeCloseTo(right.right - 200, 6);
    expect(200 - left.right).toBeCloseTo(right.left - 200, 6);
  });

  it("drops confetti down the card", () => {
    const area = { x: 10, y: 20, w: 300, h: 400 };
    const at = (progress) => bounds(painted(draw((pen) => drawConfetti(pen, area, progress, THEME))));
    expect(at(0.9).bottom).toBeGreaterThan(at(0.1).bottom);
    expect(draw((pen) => drawConfetti(pen, area, 0.5, THEME)).depth).toBe(0);
  });

  it("teaches the one gesture with a hand in the interface's colours and an arrow curving to it", () => {
    const ctx = draw((pen) => drawSteerHint(pen, [100, 300], [220, 240], 70, 0.3, THEME));
    expect(colours(ctx)).toContain(THEME.ui.paper);
    expect(ctx.calls.some((call) => call.op === "quadraticCurveTo")).toBe(true);
    expect(ctx.calls.some((call) => call.op === "fillText")).toBe(false);
    expect(ctx.depth).toBe(0);
  });
});
