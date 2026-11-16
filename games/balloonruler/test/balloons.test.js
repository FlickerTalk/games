import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBalloon, drawPop } from "../src/balloons.js";
import { THEME } from "../src/theme.js";

const { art } = THEME;

describe("a balloon", () => {
  it("is drawn in its colour around its centre, with a string down to its place on the ruler", () => {
    const ctx = draw((pen) => drawBalloon(pen, 200, 300, 60, { colour: 1, string: 80, time: 0 }, THEME));
    expect(colours(ctx)).toContain(art.balloons[1]);
    expect(colours(ctx)).toContain(art.ink);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(200 - 60 * 0.5);
    expect(box.right).toBeLessThanOrEqual(200 + 60 * 0.5);
    expect(box.top).toBeGreaterThanOrEqual(300 - 60 * 0.65);
    expect(box.bottom).toBeGreaterThan(300 + 60 * 0.69 + 70);
    expect(ctx.depth).toBe(0);
  });

  it("is told apart by a pattern as well as by its colour", () => {
    const calls = (colour) => draw((pen) => drawBalloon(pen, 0, 0, 60, { colour, string: 40, time: 0 }, THEME)).calls.length;
    expect(new Set([calls(0), calls(1), calls(2)]).size).toBe(3);
  });

  it("bobs gently, never more than a few pixels", () => {
    const top = (time) => bounds(painted(draw((pen) => drawBalloon(pen, 0, 0, 60, { colour: 0, string: 0, time }, THEME)))).top;
    const tops = [0, 0.4, 0.8, 1.2, 1.6].map(top);
    expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThan(0.5);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(6);
  });
});

describe("a pop", () => {
  it("bursts outwards in the balloon's colour and is gone when it ends", () => {
    expect(draw((pen) => drawPop(pen, 100, 100, 60, 0, 2, THEME)).calls).toEqual([]);
    expect(draw((pen) => drawPop(pen, 100, 100, 60, 1, 2, THEME)).calls).toEqual([]);
    const early = draw((pen) => drawPop(pen, 100, 100, 60, 0.2, 2, THEME));
    const late = draw((pen) => drawPop(pen, 100, 100, 60, 0.8, 2, THEME));
    expect(colours(early)).toContain(art.balloons[2]);
    const wide = (ctx) => bounds(painted(ctx)).right - bounds(painted(ctx)).left;
    expect(wide(late)).toBeGreaterThan(wide(early));
    expect(early.depth).toBe(0);
  });
});
