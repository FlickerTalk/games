import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawChip, drawDivisorButton } from "../src/button-art.js";
import { THEME } from "../src/theme.js";

const TARGET = { x: 100, y: 300, w: 110, h: 110 };
const button = (options = {}, target = TARGET, divisor = 10) => draw((ctx) => drawDivisorButton(ctx, target, divisor, THEME, options));
const chip = (options = {}) => draw((ctx) => drawChip(ctx, { x: 40, y: 40, w: 40, h: 40 }, 5, THEME, options));
const written = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const fontPx = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));
const lines = (ctx) => shapes(ctx).join("\n");

describe("a divisor button", () => {
  it("shows its divisor large, inside its target, in the app's colours", () => {
    for (const size of [66, 88, 132]) {
      const ctx = button({}, { x: 100, y: 300, w: size, h: size });
      expect(written(ctx)).toEqual(["10"]);
      expect(Math.min(...fontPx(ctx))).toBeGreaterThanOrEqual(26);
      const box = bounds(painted(ctx));
      expect(box.left).toBeGreaterThanOrEqual(100);
      expect(box.right).toBeLessThanOrEqual(100 + size);
      expect(box.bottom).toBeLessThanOrEqual(300 + size);
      expect(ctx.depth).toBe(0);
    }
    const used = new Set(colours(button()));
    for (const colour of used) expect(Object.values(THEME.ui)).toContain(colour);
  });

  it("answers a finger at once, and looks different idle, pressed, waiting for the teammate and blocked by a cap", () => {
    const looks = [{}, { pressed: true }, { dim: true }, { blocked: true, capTint: 1 }].map((options) => lines(button(options)) + colours(button(options)).join());
    expect(new Set(looks).size).toBe(4);
    expect(colours(button({ pressed: true }))).toContain(THEME.ui.pressed);
    expect(colours(button({ blocked: true, capTint: 1 }))).toContain(THEME.art.caps[1]);
  });
});

describe("a teammate's divisor", () => {
  it("is a small tile with its digit at 20 px or more", () => {
    const ctx = chip();
    expect(written(ctx)).toEqual(["5"]);
    expect(Math.min(...fontPx(ctx))).toBeGreaterThanOrEqual(20);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(40);
    expect(box.right).toBeLessThanOrEqual(80);
  });

  it("lights up when it is the teammate's turn, flashes when struck, and is crossed when a cap blocks it", () => {
    const looks = [{}, { active: true }, { struck: true }, { blocked: true }].map((options) => lines(chip(options)) + colours(chip(options)).join());
    expect(new Set(looks).size).toBe(4);
  });
});
