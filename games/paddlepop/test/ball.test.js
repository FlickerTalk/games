// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SLOW, SLOW_STEPS, hitBall, stepBall } from "../src/ball.js";
import { STEP, TABLE, frontOf } from "../src/table.js";

const R = TABLE.radius;
const ball = (fields = {}) => ({ i: 0, v: 0, by: -1, x: 0.5, y: 0.75, vx: 0, vy: 0.8, sp: 0.8, slow: 0, hits: 0, ...fields });
const field = (fields = {}) => ({ bubbles: [], pickup: null, paddles: [{ x: 0.5, wide: 0 }, { x: 0.5, wide: 0 }], own: [true, true], ...fields });
const run = (start, where, steps) => {
  let now = start;
  const events = [];
  for (let at = 0; at < steps; at += 1) {
    const out = stepBall(now, where);
    now = out.ball;
    events.push(...out.events);
    for (const index of out.pops) where.bubbles[index].popped = true;
    if (out.took) where.pickup.taken = true;
  }
  return { ball: now, events };
};

describe("the ball", () => {
  it("moves by its velocity each step, half as fast while the snail slows it", () => {
    const { ball: moved } = stepBall(ball({ vx: 0.3, vy: 0.6 }), field());
    expect(moved.x).toBeCloseTo(0.5 + 0.3 * STEP, 12);
    expect(moved.y).toBeCloseTo(0.75 + 0.6 * STEP, 12);
    const { ball: slowed } = stepBall(ball({ vy: 0.6, slow: 10 }), field());
    expect(slowed.y).toBeCloseTo(0.75 + 0.6 * STEP * SLOW, 12);
    expect(slowed.slow).toBe(9);
  });

  it("bounces off the sides and never leaves the table", () => {
    const { ball: moved, events } = run(ball({ x: 0.9, vx: 1.5, vy: 0.05 }), field(), 240);
    expect(events.some((one) => one.kind === "wall")).toBe(true);
    expect(moved.x).toBeGreaterThanOrEqual(R);
    expect(moved.x).toBeLessThanOrEqual(1 - R);
  });

  it("pops a bubble it touches and is kicked sideways, still heading for the same end", () => {
    const where = field({ bubbles: [{ x: 0.52, y: 0.95, r: 0.07, popped: false }] });
    const { ball: moved, events } = run(ball({ vy: 0.8 }), where, 40);
    expect(where.bubbles[0].popped).toBe(true);
    expect(events.filter((one) => one.kind === "pop")).toHaveLength(1);
    expect(moved.vx).toBeLessThan(0);
    expect(moved.vy).toBe(0.8);
  });

  it("takes the star for the side that hit it last, and the snail slows the ball down", () => {
    const star = field({ pickup: { look: "star", x: 0.5, y: 0.6, taken: false } });
    const { events } = run(ball({ vy: -0.8 }), star, 30);
    expect(events.find((one) => one.kind === "pick")).toMatchObject({ look: "star", seat: 0 });
    expect(star.pickup.taken).toBe(true);
    const snail = field({ pickup: { look: "snail", x: 0.5, y: 0.9, taken: false } });
    const { ball: slowed } = run(ball({ vy: 0.8 }), snail, 30);
    expect(slowed.slow).toBeGreaterThan(SLOW_STEPS - 30);
  });

  it("is sent back by the paddle it reaches, angled by where it lands, a little faster, as the hitter's new version", () => {
    const start = ball({ x: 0.6, y: frontOf(0) - R - 0.01, vy: 1 });
    const { ball: back, events } = run(start, field(), 3);
    expect(events.find((one) => one.kind === "hit")).toMatchObject({ seat: 0 });
    expect(back.vy).toBeLessThan(0);
    expect(back.vx).toBeGreaterThan(0);
    expect(Math.hypot(back.vx, back.vy)).toBeGreaterThan(start.sp);
    expect(back).toMatchObject({ v: 1, by: 0, hits: 1 });
    expect(back.y).toBeLessThan(frontOf(0) - R + 1e-9);
  });

  it("goes into the goal past a paddle that is not there", () => {
    const where = field({ paddles: [{ x: 0.21, wide: 0 }, { x: 0.5, wide: 0 }] });
    const { events } = run(ball({ x: 0.85, y: 1.2, vy: 1 }), where, 80);
    expect(events.some((one) => one.kind === "hit")).toBe(false);
    expect(events.find((one) => one.kind === "goal")).toMatchObject({ seat: 0 });
  });

  it("waits at the line of a paddle this phone does not play, for that phone to say what happened", () => {
    const where = field({ own: [false, true], paddles: [{ x: 0.1, wide: 0 }, { x: 0.5, wide: 0 }] });
    const { ball: held, events } = run(ball({ x: 0.85, y: 1.2, vy: 1 }), where, 120);
    expect(events.some((one) => one.kind === "goal" || one.kind === "hit")).toBe(false);
    expect(held.y + R).toBeLessThanOrEqual(frontOf(0) + 1e-9);
    expect(held.held).toBe(true);
  });

  it("sends a ball back the same way from the same contact, whatever phone works it out", () => {
    const one = hitBall(ball({ x: 0.55, vy: 1, hits: 2 }), 0, { x: 0.5, wide: 0 });
    const two = hitBall(ball({ x: 0.55, vy: 1, hits: 2 }), 0, { x: 0.5, wide: 0 });
    expect(one).toEqual(two);
    const edge = hitBall(ball({ x: 0.9, vy: 1 }), 0, { x: 0.5, wide: 0 });
    const middle = hitBall(ball({ x: 0.5, vy: 1 }), 0, { x: 0.5, wide: 0 });
    expect(Math.abs(edge.vx)).toBeGreaterThan(Math.abs(middle.vx));
    expect(middle.vx).toBe(0);
  });
});
