import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBalloonPop, drawParachute, drawTailBalloons, drawTally } from "../src/balloons.js";
import { TALLY } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const { balloons } = THEME.art;

describe("the balloons", () => {
  it("trail behind the tail, one per balloon left, never more than three", () => {
    const count = (left) => draw((ctx) => drawTailBalloons(ctx, left, THEME, { time: 1 })).calls.length;
    expect(count(0)).toBe(0);
    expect(count(2)).toBeGreaterThan(count(1));
    expect(count(3)).toBeGreaterThan(count(2));
    expect(count(7)).toBe(count(3));
    const ctx = draw((pen) => drawTailBalloons(pen, 3, THEME, { time: 1 }));
    expect(bounds(painted(ctx)).top).toBeGreaterThan(30);
  });

  it("are round for one player and squared for the other, so they are told apart without colour", () => {
    const round = draw((ctx) => drawTailBalloons(ctx, 3, THEME));
    const squared = draw((ctx) => drawTailBalloons(ctx, 3, THEME, { squared: true }));
    expect(round.calls.filter((call) => call.op === "ellipse")).toHaveLength(3);
    expect(squared.calls.filter((call) => call.op === "ellipse")).toHaveLength(0);
    expect(colours(round)).toEqual(expect.arrayContaining(balloons.round));
    expect(colours(squared)).toEqual(expect.arrayContaining(balloons.squared));
  });

  it("burst into pieces that fly out and fade, and are gone at the end", () => {
    const reach = (progress) => {
      const { left, right } = bounds(painted(draw((ctx) => drawBalloonPop(ctx, 100, 100, 60, progress, THEME))));
      return right - left;
    };
    expect(reach(0.8)).toBeGreaterThan(reach(0.2));
    expect(draw((ctx) => drawBalloonPop(ctx, 100, 100, 60, 1, THEME)).calls).toHaveLength(0);
    expect(draw((ctx) => drawBalloonPop(ctx, 100, 100, 60, 0.5, THEME)).depth).toBe(0);
  });

  it("show the parachute with its smiling flag", () => {
    const ctx = draw((pen) => drawParachute(pen, 100, 100, 60, THEME, { time: 2 }));
    expect(colours(ctx)).toEqual(expect.arrayContaining([THEME.art.effects.parachute, THEME.art.effects.flag]));
    expect(ctx.calls.filter((call) => call.op === "arc").length).toBeGreaterThanOrEqual(1);
    expect(ctx.depth).toBe(0);
  });

  it("are counted in a tally of three in the interface's colours: those left in colour, those popped as empty shapes", () => {
    const area = { x: 20, y: 30, ...TALLY };
    for (const squared of [false, true]) {
      const full = draw((ctx) => drawTally(ctx, area, 3, THEME, { squared }));
      const one = draw((ctx) => drawTally(ctx, area, 1, THEME, { squared }));
      const colour = squared ? balloons.squared[0] : balloons.round[0];
      expect(colours(full).filter((value) => value === colour)).toHaveLength(3);
      expect(colours(one).filter((value) => value === colour)).toHaveLength(1);
      expect(colours(full)).toContain(THEME.ui.surface);
      const { left, right, top, bottom } = bounds(painted(full));
      expect(left).toBeGreaterThanOrEqual(area.x - 2);
      expect(right).toBeLessThanOrEqual(area.x + area.w + 2);
      expect(top).toBeGreaterThanOrEqual(area.y - 2);
      expect(bottom).toBeLessThanOrEqual(area.y + area.h + 2);
    }
  });
});
