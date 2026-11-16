import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/avatars/recorder.js";
import { SCENERIES, drawScenery } from "../src/scenery.js";
import { THEME } from "../src/theme.js";

const themed = new Set(JSON.stringify(THEME).match(/#[0-9A-F]{6}|rgba\([^)]*\)/g));
const frame = { w: 384, h: 801 };
const band = { x: 0, y: 96, w: 384, h: 100 };

describe("the courtyards", () => {
  it("are five, each drawn its own way", () => {
    expect(SCENERIES).toEqual(["patio", "rooftop", "greenhouse", "seaside", "night"]);
    const drawn = SCENERIES.map((kind) => shapes(draw((ctx) => drawScenery(ctx, kind, frame, band, THEME, 0))).join("\n"));
    expect(new Set(drawn).size).toBe(5);
  });

  it("fill the frame with their ground and keep their details inside it", () => {
    for (const kind of SCENERIES) {
      const ctx = draw((pen) => drawScenery(pen, kind, frame, band, THEME, 1.5));
      expect(ctx.calls[0]).toBeDefined();
      const box = bounds(painted(ctx));
      expect(box.left, kind).toBeGreaterThanOrEqual(-1);
      expect(box.right, kind).toBeLessThanOrEqual(385);
      expect(box.top, kind).toBeGreaterThanOrEqual(0);
      expect(box.bottom, kind).toBeLessThanOrEqual(801);
      for (const colour of colours(ctx)) expect(themed.has(colour), `${kind} ${colour}`).toBe(true);
      expect(ctx.depth).toBe(0);
    }
  });

  it("draw only the ground when there is no room for the details", () => {
    const ctx = draw((pen) => drawScenery(pen, "patio", frame, { x: 0, y: 96, w: 384, h: 12 }, THEME, 0));
    expect(ctx.calls.filter((call) => call.op === "fillRect")).toHaveLength(1);
  });

  it("let the night's stars glow slowly, never flashing", () => {
    const alphas = (time) => draw((pen) => drawScenery(pen, "night", frame, band, THEME, time)).calls.filter((call) => call.name === "globalAlpha").map((call) => call.value);
    const now = alphas(0);
    const soon = alphas(1 / 6);
    now.forEach((alpha, at) => expect(Math.abs(alpha - soon[at])).toBeLessThan(0.1));
  });
});
