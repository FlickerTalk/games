// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PADDLE_SPEED, STEP, TABLE, frontOf, goalOf, halfOf, movePaddle, otherSeat } from "../src/table.js";

describe("the table", () => {
  it("has seat 0 at the far end of its length and seat 1 at the start, each paddle in front of its goal", () => {
    expect(goalOf(0)).toBe(TABLE.length);
    expect(goalOf(1)).toBe(0);
    expect(frontOf(0)).toBeLessThan(TABLE.length);
    expect(frontOf(0)).toBeGreaterThan(TABLE.length / 2);
    expect(frontOf(1)).toBeCloseTo(TABLE.length - frontOf(0), 12);
    expect(otherSeat(0)).toBe(1);
    expect(otherSeat(1)).toBe(0);
  });

  it("makes a paddle wider while it carries the star", () => {
    expect(halfOf({ wide: 0 })).toBe(TABLE.half);
    expect(halfOf({ wide: 30 })).toBe(TABLE.wide);
    expect(TABLE.wide / TABLE.half).toBeCloseTo(172 / 140, 1);
  });

  it("moves a paddle towards the finger no faster than its speed, and keeps it on the table", () => {
    const paddle = { x: 0.5, target: 0.9, wide: 0 };
    movePaddle(paddle);
    expect(paddle.x).toBeCloseTo(0.5 + PADDLE_SPEED * STEP, 12);
    for (let step = 0; step < 200; step += 1) movePaddle(paddle);
    expect(paddle.x).toBe(1 - TABLE.half);
    paddle.target = 0.79;
    for (let step = 0; step < 200; step += 1) movePaddle(paddle);
    expect(paddle.x).toBe(0.79);
    paddle.target = Number.NaN;
    movePaddle(paddle);
    expect(paddle.x).toBe(0.79);
  });
});
