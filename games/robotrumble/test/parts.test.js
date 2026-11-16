import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBoot, drawConfetti, drawDizzyStars, drawFlyingPart, drawGhostMarker, drawGlove, drawImpactStar, drawMotionLines, drawShield } from "../src/parts.js";
import { THEME } from "../src/theme.js";

const box = (paint) => bounds(painted(draw(paint)));

describe("the gloves, boots and effects", () => {
  it("draws the glove and the boot around their centre at the size asked, as two different shapes", () => {
    for (const [name, paint] of [["glove", drawGlove], ["boot", drawBoot]]) {
      const area = box((pen) => paint(pen, 100, 100, 40, THEME));
      expect(area.left, name).toBeGreaterThanOrEqual(70);
      expect(area.right, name).toBeLessThanOrEqual(130);
      expect(area.top, name).toBeGreaterThanOrEqual(70);
      expect(area.bottom, name).toBeLessThanOrEqual(130);
    }
    const glove = shapes(draw((pen) => drawGlove(pen, 0, 0, 40, THEME)));
    expect(glove).not.toEqual(shapes(draw((pen) => drawBoot(pen, 0, 0, 40, THEME))));
    const flipped = box((pen) => drawGlove(pen, 100, 100, 40, THEME, { facing: -1 }));
    const straight = box((pen) => drawGlove(pen, 100, 100, 40, THEME));
    expect(flipped.left).toBeCloseTo(200 - straight.right, 4);
  });

  it("throws a bolt or a spring off in an arc that lands where it started", () => {
    const at = (progress, type) => box((pen) => drawFlyingPart(pen, 100, 100, 32, THEME, { type, progress }));
    for (const type of ["bolt", "spring"]) {
      expect(at(0.5, type).top).toBeLessThan(at(0, type).top - 10);
      expect(Math.abs(at(1, type).top - at(0, type).top)).toBeLessThan(32);
    }
    expect(shapes(draw((pen) => drawFlyingPart(pen, 0, 0, 32, THEME, { type: "bolt" })))).not.toEqual(shapes(draw((pen) => drawFlyingPart(pen, 0, 0, 32, THEME, { type: "spring" }))));
  });

  it("grows the impact star with the hit and lets it go, inside its size", () => {
    const wide = (progress) => {
      const area = box((pen) => drawImpactStar(pen, 100, 100, 64, THEME, progress));
      return area.right - area.left;
    };
    expect(wide(0.5)).toBeGreaterThan(wide(0.05));
    expect(wide(0.5)).toBeLessThanOrEqual(64 * 1.2);
  });

  it("circles three stars over a dizzy robot, moving with time", () => {
    const one = draw((pen) => drawDizzyStars(pen, 100, 100, 60, THEME, 0));
    expect(one.calls.filter((call) => call.op === "fill")).toHaveLength(3);
    expect(shapes(one)).not.toEqual(shapes(draw((pen) => drawDizzyStars(pen, 100, 100, 60, THEME, 0.4))));
  });

  it("spreads the confetti as it falls and keeps every drawing's save and restore paired", () => {
    const early = box((pen) => drawConfetti(pen, 100, 100, 160, THEME, 0.1));
    const late = box((pen) => drawConfetti(pen, 100, 100, 160, THEME, 0.9));
    expect(late.right - late.left).toBeGreaterThan(early.right - early.left);
    const all = [
      (pen) => drawGlove(pen, 0, 0, 40, THEME),
      (pen) => drawBoot(pen, 0, 0, 40, THEME),
      (pen) => drawFlyingPart(pen, 0, 0, 32, THEME, { type: "spring", progress: 0.3 }),
      (pen) => drawImpactStar(pen, 0, 0, 64, THEME, 0.3),
      (pen) => drawConfetti(pen, 0, 0, 160, THEME, 0.3),
      (pen) => drawDizzyStars(pen, 0, 0, 60, THEME, 1),
      (pen) => drawMotionLines(pen, 0, 0, 40, THEME, 1),
      (pen) => drawGhostMarker(pen, 0, 0, 34, THEME, 1),
      (pen) => drawShield(pen, 0, 0, 96, THEME, 1),
    ];
    for (const paint of all) {
      const ctx = draw(paint);
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.length).toBeGreaterThan(5);
    }
  });

  it("bobs the marker of a player on another phone", () => {
    const at = (time) => box((pen) => drawGhostMarker(pen, 100, 100, 34, THEME, time)).top;
    expect(at(0.5)).not.toBeCloseTo(at(0), 1);
  });
});
