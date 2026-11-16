// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Glide } from "../../src/duel/glide.js";

describe("a correction drawn as a glide", () => {
  it("draws nothing extra until something jumps", () => {
    const glide = new Glide();
    expect(glide.at(100)).toEqual({ x: 0, y: 0 });
  });

  it("keeps a jumped thing where it was drawn, then closes most of the gap within its time", () => {
    const glide = new Glide({ over: 100 });
    glide.jump({ x: 0.3, y: -0.2 }, 1000);
    expect(glide.at(1000)).toEqual({ x: -0.3, y: 0.2 });
    const later = glide.at(1100);
    expect(Math.abs(later.x)).toBeLessThan(0.3 * 0.4);
    expect(Math.sign(later.x)).toBe(-1);
    expect(glide.at(1600)).toEqual({ x: 0, y: 0 });
  });

  it("adds a second jump to what is left of the first", () => {
    const glide = new Glide({ over: 100 });
    glide.jump({ x: 1, y: 0 }, 0);
    const left = glide.at(50).x;
    glide.jump({ x: 1, y: 0 }, 50);
    expect(glide.at(50).x).toBeCloseTo(left - 1, 9);
  });

  it("drops a jump too big to be a correction, and starts again when reset", () => {
    const glide = new Glide({ over: 100, most: 0.5 });
    glide.jump({ x: 2, y: 0 }, 0);
    expect(glide.at(0)).toEqual({ x: 0, y: 0 });
    glide.jump({ x: 0.2, y: 0 }, 0);
    glide.reset();
    expect(glide.at(0)).toEqual({ x: 0, y: 0 });
  });
});
