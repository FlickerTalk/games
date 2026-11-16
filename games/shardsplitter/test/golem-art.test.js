import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { MOODS, drawGolem, drawShard } from "../src/golem-art.js";
import { THEME } from "../src/theme.js";

const golem = (size, options = {}) => draw((ctx) => drawGolem(ctx, 200, 200, size, { number: 30, mood: "waiting", time: 0.4, ...options }, THEME));
const lines = (ctx) => shapes(ctx).join("\n");
const written = (ctx) => ctx.calls.filter((call) => call.op === "fillText");
const fontPx = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));

describe("a crystal golem", () => {
  it("stays within its size at every size and in every mood, and leaves the drawing state as it found it", () => {
    for (const size of [44, 60, 96, 150]) {
      for (const mood of MOODS) {
        const ctx = golem(size, { mood, cap: 10 });
        const box = bounds(painted(ctx));
        const reach = size * 0.62 + 6;
        expect(box.left, `${size} ${mood}`).toBeGreaterThan(200 - reach);
        expect(box.right, `${size} ${mood}`).toBeLessThan(200 + reach);
        expect(box.top, `${size} ${mood}`).toBeGreaterThan(200 - reach);
        expect(box.bottom, `${size} ${mood}`).toBeLessThan(200 + reach);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("carries its number on its belly in digits of 20 px or more, however small it is", () => {
    for (const size of [40, 46, 60, 96, 150]) {
      for (const number of [3, 13, 100]) {
        const ctx = golem(size, { number });
        expect(written(ctx).map((call) => call.text)).toEqual([String(number)]);
        expect(Math.min(...fontPx(ctx)), `${size}`).toBeGreaterThanOrEqual(20);
      }
    }
    expect(Math.max(...fontPx(golem(150)))).toBeGreaterThanOrEqual(32);
  });

  it("looks different waiting, rolling in, giggling and sticking its tongue out", () => {
    expect(MOODS).toEqual(["waiting", "rolling", "giggle", "tongue"]);
    expect(new Set(MOODS.map((mood) => lines(golem(150, { mood })))).size).toBe(4);
  });

  it("wears a cap that repeats the blocked divisor where the digit can be 20 px, and a plain cap when it is small", () => {
    const big = golem(150, { cap: 10, capTint: 2 });
    expect(written(big).map((call) => call.text).sort()).toEqual(["10", "30"]);
    expect(Math.min(...fontPx(big))).toBeGreaterThanOrEqual(20);
    expect(lines(big)).not.toBe(lines(golem(150)));
    const small = golem(50, { cap: 10 });
    expect(written(small).map((call) => call.text)).toEqual(["30"]);
    expect(lines(small)).not.toBe(lines(golem(50)));
  });
});

describe("a crystal on its way to the jar", () => {
  it("is a plain shard that shows its number only when there is room for it", () => {
    const big = draw((ctx) => drawShard(ctx, 100, 100, 60, { value: 7, angle: 0.4 }, THEME));
    expect(written(big).map((call) => call.text)).toEqual(["7"]);
    expect(Math.min(...fontPx(big))).toBeGreaterThanOrEqual(20);
    const small = draw((ctx) => drawShard(ctx, 100, 100, 24, { value: 1, angle: 0 }, THEME));
    expect(written(small)).toEqual([]);
    expect(small.depth).toBe(0);
    const box = bounds(painted(big));
    expect(box.right - box.left).toBeLessThan(80);
  });
});
