import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { BALLS, drawConfetti, drawDottedPath, drawFlight, drawPaintBall, drawPaintStain, drawSlingshot, drawSplash, drawTorpedo, drawWaterSplash, drawWaterStain } from "../src/effects.js";
import { THEME } from "../src/theme.js";

const art = THEME.art;
const path = Array.from({ length: 30 }, (_, at) => [at * 10, 100 - at * 6 + at * at * 0.3]);

describe("the paint effects", () => {
  it("draw five paint balls, each its own shape, about as big as the radius given", () => {
    expect(BALLS).toEqual(["normal", "triple", "bouncy", "big", "rainbow"]);
    expect(new Set(BALLS.map((ball) => shapes(draw((ctx) => drawPaintBall(ctx, 50, 50, 10, ball, art.player, art, 0))).join("|"))).size).toBe(5);
    for (const ball of BALLS) {
      const box = bounds(painted(draw((ctx) => drawPaintBall(ctx, 50, 50, 10, ball, art.player, art, 0))));
      expect(box.right - box.left, ball).toBeLessThanOrEqual(26);
    }
  });

  it("move the ball along its path with a short trail, and show the aim as dots, faint once shot", () => {
    const early = bounds(painted(draw((ctx) => drawFlight(ctx, { points: path, progress: 0.2, ball: "normal", colour: art.player }, art, 0))));
    const late = bounds(painted(draw((ctx) => drawFlight(ctx, { points: path, progress: 0.8, ball: "normal", colour: art.player }, art, 0))));
    expect(late.right).toBeGreaterThan(early.right);
    const dim = draw((ctx) => drawDottedPath(ctx, path, art.player, art, { faint: true }));
    expect(dim.calls.some((call) => call.op === "set" && call.name === "globalAlpha" && call.value < 1)).toBe(true);
    expect(draw((ctx) => drawFlight(ctx, { points: path, progress: 0.5, torpedo: true, colour: art.player }, art, 0)).calls.length).toBeGreaterThan(10);
    expect(draw((ctx) => drawFlight(ctx, { points: path, progress: 0.5, sea: 50, ball: "big", colour: art.player }, art, 0)).calls.length).toBeGreaterThan(10);
  });

  it("pull a slingshot band back from the vehicle with the ball in it", () => {
    const ctx = draw((pen) => drawSlingshot(pen, { from: [100, 100], pull: [60, 140], points: path.slice(0, 8), colour: art.player, ball: "normal" }, art));
    const box = bounds(painted(ctx));
    expect(box.left).toBeLessThanOrEqual(60 - 8);
    expect(box.bottom).toBeGreaterThanOrEqual(140);
  });

  it("splash and stain where paint lands, on the ground and in the water, and then go", () => {
    for (const splash of [drawSplash, drawWaterSplash]) {
      expect(draw((ctx) => splash(ctx, 100, 100, 40, 0, art.rival, art, 3)).calls).toEqual([]);
      expect(draw((ctx) => splash(ctx, 100, 100, 40, 1, art.rival, art, 3)).calls).toEqual([]);
      expect(draw((ctx) => splash(ctx, 100, 100, 40, 0.4, art.rival, art, 3)).calls.length).toBeGreaterThan(10);
    }
    const stain = bounds(painted(draw((ctx) => drawPaintStain(ctx, 100, 100, 20, art.rival, art, 4))));
    expect(stain.right - stain.left).toBeGreaterThan(stain.bottom - stain.top);
    expect(draw((ctx) => drawWaterStain(ctx, 100, 100, 20, art.rival, art, 1, 2)).calls).toEqual([]);
    expect(draw((ctx) => drawWaterStain(ctx, 100, 100, 20, art.rival, art, 0.3, 2)).calls.length).toBeGreaterThan(4);
  });

  it("draw a paint torpedo pointing where it goes, and confetti that falls", () => {
    const right = bounds(painted(draw((ctx) => drawTorpedo(ctx, 100, 100, 30, 0, art.player, art, 0))));
    expect(right.right - right.left).toBeGreaterThan(right.bottom - right.top);
    const up = draw((ctx) => drawConfetti(ctx, { x: 0, y: 0, w: 300, h: 300 }, 0.1, art, 4));
    const down = draw((ctx) => drawConfetti(ctx, { x: 0, y: 0, w: 300, h: 300 }, 0.9, art, 4));
    expect(bounds(painted(down)).bottom).toBeGreaterThan(bounds(painted(up)).bottom);
  });
});
