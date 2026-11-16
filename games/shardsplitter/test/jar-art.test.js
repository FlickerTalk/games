import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawJar } from "../src/jar-art.js";
import { THEME } from "../src/theme.js";

const jar = (fill, size = 42) => draw((ctx) => drawJar(ctx, 100, 100, size, fill, THEME, 0.5));
const lines = (ctx) => shapes(ctx).join("\n");

describe("the jar", () => {
  it("stays inside its size at the bar's sizes and larger, without a word", () => {
    for (const size of [34, 42, 120]) {
      const ctx = jar(0.5, size);
      const box = bounds(painted(ctx));
      expect(box.left).toBeGreaterThanOrEqual(100 - size / 2 - 1);
      expect(box.right).toBeLessThanOrEqual(100 + size / 2 + 1);
      expect(box.top).toBeGreaterThanOrEqual(100 - size / 2 - 1);
      expect(box.bottom).toBeLessThanOrEqual(100 + size / 2 + 1);
      expect(ctx.calls.filter((call) => call.op === "fillText")).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
  });

  it("fills as the round goes on and shows a star when it is full", () => {
    expect(new Set([0, 0.3, 0.7, 1].map((fill) => lines(jar(fill)))).size).toBe(4);
    expect(lines(jar(4))).toBe(lines(jar(1)));
    expect(lines(jar(-1))).toBe(lines(jar(0)));
  });
});
