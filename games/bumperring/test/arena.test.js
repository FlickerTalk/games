// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BAR, BODY, START, VARIANTS, barOffset, onIce, onTrampoline, radiusOf, turned } from "../src/arena.js";

describe("the platform", () => {
  it("is a disc of radius one with the two players starting apart, each on their own side", () => {
    expect(START).toEqual([[0, 0.45], [0, -0.45]]);
    expect(Math.hypot(START[0][0] - START[1][0], START[0][1] - START[1][1])).toBeGreaterThan(2 * BODY + 0.3);
    expect(VARIANTS).toEqual(["plain", "shrink", "ice", "trampoline", "bar"]);
  });

  it("keeps its size but for the shrinking one, which loses a third by the end of the round and no more", () => {
    for (const variant of VARIANTS.filter((one) => one !== "shrink")) expect(radiusOf(variant, 3000, 6000)).toBe(1);
    expect(radiusOf("shrink", 0, 6000)).toBe(1);
    expect(radiusOf("shrink", 3000, 6000)).toBeCloseTo(0.825, 9);
    expect(radiusOf("shrink", 6000, 6000)).toBeCloseTo(0.65, 9);
    expect(radiusOf("shrink", 9000, 6000)).toBeCloseTo(0.65, 9);
  });

  it("has its icy patch to one side and its trampoline in the middle, clear of where the players start", () => {
    expect(onIce(0.25, -0.05)).toBe(true);
    expect(onIce(-0.5, 0)).toBe(false);
    expect(onTrampoline(0.1, 0.1)).toBe(true);
    for (const [x, y] of START) expect(onTrampoline(x, y)).toBe(false);
  });

  it("turns a direction a little each step, keeping its length, a full turn in 360 steps", () => {
    let arrow = { x: 0, y: -1 };
    for (let at = 0; at < 90; at += 1) arrow = turned(arrow, "arrow");
    expect(arrow.x).toBeCloseTo(1, 9);
    expect(arrow.y).toBeCloseTo(0, 9);
    for (let at = 0; at < 270; at += 1) arrow = turned(arrow, "arrow");
    expect(Math.hypot(arrow.x, arrow.y)).toBeCloseTo(1, 12);
    expect(arrow.y).toBeCloseTo(-1, 9);
  });

  it("says how far a point is from the turning bar, and how far along it", () => {
    const bar = { x: 1, y: 0 };
    expect(barOffset(bar, 0.3, 0.1)).toEqual({ along: 0.3, across: 0.1 });
    expect(barOffset(bar, 0.3, -0.1).across).toBeCloseTo(-0.1, 12);
    expect(BAR.half).toBeLessThan(1);
    expect(Math.abs(barOffset(bar, START[0][0], START[0][1]).across)).toBeGreaterThan(BODY + BAR.thick);
  });
});
