import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBall, drawBubble, drawPlanetBumper, drawSlowEffect, drawSnailPickup, drawStarPickup } from "../src/things.js";
import { THEME } from "../src/theme.js";

const box = (paint) => {
  const ctx = draw(paint);
  expect(ctx.depth).toBe(0);
  return bounds(painted(ctx));
};

describe("the things on the table", () => {
  it("draws the ball at its radius, with a trail behind it along its way and none when asked", () => {
    const still = box((pen) => drawBall(pen, 100, 100, 14, THEME, { trail: false }));
    expect(still).toEqual({ left: 86, right: 114, top: 86, bottom: 114 });
    const moving = box((pen) => drawBall(pen, 100, 100, 14, THEME, { angle: -Math.PI / 2 }));
    expect(moving.bottom).toBeGreaterThan(130);
    expect(moving.top).toBe(86);
    const second = box((pen) => drawBall(pen, 100, 100, 12, THEME, { second: true, trail: false }));
    expect(second.right - second.left).toBe(24);
  });

  it("draws a bubble or a planet bumper within its reach, and their pop as drops flying out and shrinking", () => {
    const bubble = box((pen) => drawBubble(pen, 100, 100, 24, THEME));
    expect(bubble.right - bubble.left).toBeLessThanOrEqual(50);
    const planet = box((pen) => drawPlanetBumper(pen, 100, 100, 24, THEME));
    expect(planet.right - planet.left).toBeLessThanOrEqual(24 * 3.3);
    const early = box((pen) => drawBubble(pen, 100, 100, 24, THEME, { pop: 0.2 }));
    const late = box((pen) => drawBubble(pen, 100, 100, 24, THEME, { pop: 0.8 }));
    expect(late.right - late.left).toBeGreaterThan(early.right - early.left);
    const gone = draw((pen) => drawBubble(pen, 100, 100, 24, THEME, { pop: 1 }));
    expect(gone.calls.filter((call) => call.op === "fill" || call.op === "stroke")).toEqual([]);
  });

  it("draws the star and the snail at their size, the snail's slow rings around it", () => {
    const star = box((pen) => drawStarPickup(pen, 100, 100, 25, THEME, 0));
    expect(star.right - star.left).toBeLessThanOrEqual(25 * 3.4);
    const snail = box((pen) => drawSnailPickup(pen, 100, 100, 29, THEME, 0));
    expect(snail.right - snail.left).toBeLessThanOrEqual(29 * 1.6);
    const rings = box((pen) => drawSlowEffect(pen, 100, 100, 40, THEME, 0));
    expect(rings.right - rings.left).toBeGreaterThan(80);
  });
});
