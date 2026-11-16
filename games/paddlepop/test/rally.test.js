// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SURPRISES, rallyOf } from "../src/rally.js";
import { TABLE } from "../src/table.js";

const centre = { x: 0.5, y: TABLE.length / 2 };
const apart = (one, two) => Math.hypot(one.x - two.x, one.y - two.y);

describe("a rally", () => {
  it("is the same on both phones: the seed, the rally's number and the score decide everything", () => {
    for (let k = 0; k < 12; k += 1) expect(rallyOf("seed1234", k, [k % 3, 1], 0.7)).toEqual(rallyOf("seed1234", k, [k % 3, 1], 0.7));
    expect(rallyOf("seed1234", 3, [1, 2], 0.7)).not.toEqual(rallyOf("seed9999", 3, [1, 2], 0.7));
  });

  it("starts the match plain, then brings one surprise a rally, never the same twice running, all of them soon", () => {
    expect(rallyOf("abc", 0, [0, 0], 0.7).kind).toBe("none");
    for (const seed of ["abc", "xyz", "q1w2e3r4"]) {
      const kinds = Array.from({ length: 9 }, (_, k) => rallyOf(seed, k + 1, [0, 0], 0.7).kind);
      for (const kind of kinds) expect(SURPRISES).toContain(kind);
      kinds.slice(1).forEach((kind, at) => expect(kind, seed).not.toBe(kinds[at]));
      expect(new Set(kinds).size, seed).toBe(4);
    }
  });

  it("serves from the middle towards the side that is behind, gently, one ball or two going opposite ways", () => {
    const behind = rallyOf("abc", 2, [2, 0], 0.8);
    expect(behind.toward).toBe(0);
    expect(rallyOf("abc", 2, [0, 2], 0.8).toward).toBe(1);
    for (let k = 1; k < 30; k += 1) {
      const rally = rallyOf(`s${k}`, k, [1, 1], 0.8);
      const [first, second] = rally.balls;
      expect(first).toMatchObject({ i: 0, k, v: 0, by: -1, x: centre.x, y: centre.y, sp: 0.8, slow: 0, hits: 0 });
      expect(Math.sign(first.vy)).toBe(rally.toward === 0 ? 1 : -1);
      expect(Math.hypot(first.vx, first.vy)).toBeLessThan(0.8);
      if (rally.kind === "second") {
        expect(second).toMatchObject({ i: 1, k });
        expect(Math.sign(second.vy)).toBe(-Math.sign(first.vy));
      } else expect(rally.balls).toHaveLength(1);
    }
  });

  it("floats its bubbles in the middle of the table, apart from each other and from the serve", () => {
    for (let k = 1; k < 60; k += 1) {
      const rally = rallyOf(`b${k}`, k, [0, 0], 0.7);
      if (rally.kind !== "bubbles") continue;
      expect(rally.bubbles.length).toBeGreaterThanOrEqual(2);
      for (const bubble of rally.bubbles) {
        expect(bubble.popped).toBe(false);
        expect(bubble.x - bubble.r).toBeGreaterThan(0.1);
        expect(bubble.x + bubble.r).toBeLessThan(0.9);
        expect(Math.abs(bubble.y - centre.y)).toBeLessThan(0.36);
        expect(apart(bubble, centre)).toBeGreaterThan(0.18);
      }
      rally.bubbles.forEach((one, at) => rally.bubbles.slice(at + 1).forEach((two) => expect(apart(one, two)).toBeGreaterThan(one.r + two.r + 0.08)));
    }
  });

  it("puts the star or the snail off the serve's line, in the middle of the table", () => {
    for (let k = 1; k < 60; k += 1) {
      const rally = rallyOf(`p${k}`, k, [0, 0], 0.7);
      if (rally.kind !== "star" && rally.kind !== "snail") {
        expect(rally.pickup).toBeNull();
        continue;
      }
      expect(rally.pickup).toMatchObject({ look: rally.kind, taken: false });
      expect(Math.abs(rally.pickup.x - 0.5)).toBeGreaterThan(0.09);
      expect(Math.abs(rally.pickup.y - centre.y)).toBeLessThan(0.3);
    }
  });
});
