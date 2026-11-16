import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { SKIES } from "../src/levels.js";
import { drawSky } from "../src/sky.js";
import { THEME, themeFor } from "../src/theme.js";

const AREA = { x: 20, y: 30, w: 368, h: 515 };

describe("the five skies", () => {
  it("draws each place its own way, clipped to its area, without a word", () => {
    const seen = new Set();
    for (const place of SKIES) {
      const ctx = draw((pen) => drawSky(pen, AREA, place, THEME));
      const first = ctx.calls.findIndex((call) => call.op === "clip");
      expect(first, place).toBeGreaterThan(0);
      expect(ctx.calls.slice(0, first).filter((call) => call.op === "fill" || call.op === "fillRect"), place).toHaveLength(0);
      const clip = bounds(ctx.calls.slice(0, first).flatMap((call) => call.points));
      expect(clip.left, place).toBeGreaterThanOrEqual(AREA.x - 0.5);
      expect(clip.right, place).toBeLessThanOrEqual(AREA.x + AREA.w + 0.5);
      expect(clip.top, place).toBeGreaterThanOrEqual(AREA.y - 0.5);
      expect(clip.bottom, place).toBeLessThanOrEqual(AREA.y + AREA.h + 0.5);
      expect(ctx.depth, place).toBe(0);
      expect(ctx.calls.some((call) => call.op === "fillText"), place).toBe(false);
      expect(colours(ctx), place).toContain(THEME.art.skies[place].sky);
      seen.add(shapes(ctx).join("\n"));
    }
    expect(seen.size).toBe(SKIES.length);
  });

  it("never moves: the ground far below is the same at any moment and for any size of the same shape", () => {
    const at = (area) => shapes(draw((pen) => drawSky(pen, area, "desert", THEME)), { shift: [area.x, area.y] }).join("\n");
    expect(at(AREA)).toBe(at(AREA));
    expect(at({ ...AREA, x: 0, y: 0 })).toBe(at(AREA));
  });

  it("lies on its side with the sky, and fits a small tile", () => {
    for (const place of SKIES) {
      const ctx = draw((pen) => drawSky(pen, { x: 10, y: 10, w: 140, h: 100 }, place, THEME, { side: true }));
      expect(ctx.depth, place).toBe(0);
      expect(painted(ctx).length, place).toBeGreaterThan(10);
    }
  });

  it("uses the dusk colours of a dark page", () => {
    const dark = themeFor(tokensFor("ember-dark"), { dark: true });
    const ctx = draw((pen) => drawSky(pen, AREA, "morning", dark));
    expect(colours(ctx)).toContain(dark.art.skies.morning.sky);
    expect(colours(ctx)).not.toContain(THEME.art.skies.morning.sky);
  });
});
