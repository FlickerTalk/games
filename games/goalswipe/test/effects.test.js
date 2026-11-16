import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBurst, drawConfetti, drawHalo, drawRipple, drawSwipeTrail, drawWarningRing } from "../src/effects.js";
import { THEME } from "../src/theme.js";

const { effects } = THEME.art;

describe("the effects", () => {
  it("draw the swipe as a wide soft line with a bright core along the finger's path", () => {
    const ctx = draw((pen) => drawSwipeTrail(pen, [[100, 500], [110, 420], [130, 350]], THEME));
    expect(colours(ctx)).toEqual([effects.swipe, effects.swipeCore]);
    expect(bounds(painted(ctx))).toMatchObject({ left: 100, right: 130, top: 350, bottom: 500 });
    expect(draw((pen) => drawSwipeTrail(pen, [[1, 1]], THEME)).calls).toHaveLength(0);
  });

  it("mark the ball's spot with a halo that shows more under a finger", () => {
    const alpha = (active) => draw((pen) => drawHalo(pen, 192, 600, 132, THEME, { active })).calls.find((call) => call.name === "globalAlpha").value;
    expect(alpha(true)).toBeGreaterThan(alpha(false));
    const box = bounds(painted(draw((pen) => drawHalo(pen, 192, 600, 132, THEME))));
    expect(box.right - box.left).toBe(132);
  });

  it("grow the warning ring inside its 96 px and tick it when the ball is caught", () => {
    const ring = (progress, options) => draw((pen) => drawWarningRing(pen, 200, 200, 96, progress, THEME, options));
    const inner = (ctx) => ctx.calls.filter((call) => call.op === "arc")[1].radius;
    expect(inner(ring(1))).toBeGreaterThan(inner(ring(0)));
    const box = bounds(painted(ring(1)));
    expect(box.right - box.left).toBeLessThanOrEqual(96.5);
    expect(colours(ring(1, { caught: true }))).toContain(effects.caught);
    expect(ring(0.5).depth).toBe(0);
  });

  it("burst only while a success is being answered: nothing before it starts or after it ends", () => {
    const burst = (progress, kind) => draw((pen) => drawBurst(pen, 200, 200, 100, progress, THEME, { kind, seed: 3 }));
    expect(burst(0).calls).toHaveLength(0);
    expect(burst(1).calls).toHaveLength(0);
    expect(burst(0.4).calls.length).toBeGreaterThan(20);
    expect(shapes(burst(0.4, "stars"))).not.toEqual(shapes(burst(0.4, "confetti")));
    expect(burst(0.4).depth).toBe(0);
  });

  it("ripple around a catch and rain confetti over the end card the same way", () => {
    expect(draw((pen) => drawRipple(pen, 200, 200, 90, 0, THEME)).calls).toHaveLength(0);
    expect(draw((pen) => drawRipple(pen, 200, 200, 90, 0.5, THEME)).calls.length).toBeGreaterThan(4);
    const area = { x: 20, y: 80, w: 340, h: 600 };
    expect(draw((pen) => drawConfetti(pen, area, 1, THEME)).calls).toHaveLength(0);
    const ctx = draw((pen) => drawConfetti(pen, area, 0.5, THEME));
    for (const colour of colours(ctx)) expect(effects.confetti).toContain(colour);
    expect(ctx.depth).toBe(0);
  });
});
