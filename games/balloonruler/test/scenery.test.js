import { describe, expect, it } from "vitest";
import { colours, draw } from "../../../kit/test/canvas/recorder.js";
import { drawScenery } from "../src/scenery.js";
import { THEME } from "../src/theme.js";

const AREA = Object.freeze({ x: 0, y: 100, w: 384, h: 600 });

describe("the scenery", () => {
  it("draws the meadow, the mountain and the sky above the clouds, each in its own colours, clipped to its area", () => {
    for (const place of ["meadow", "mountain", "clouds"]) {
      const ctx = draw((pen) => drawScenery(pen, AREA, place, THEME, 3));
      const seen = colours(ctx);
      for (const colour of Object.values(THEME.art.places[place])) expect(seen, `${place} ${colour}`).toContain(colour);
      expect(ctx.calls.some((call) => call.op === "clip"), place).toBe(true);
      expect(ctx.depth, place).toBe(0);
    }
  });

  it("falls back on the meadow for a place it does not know, and keeps still but for a drifting cloud", () => {
    const meadow = draw((pen) => drawScenery(pen, AREA, "meadow", THEME, 3));
    const unknown = draw((pen) => drawScenery(pen, AREA, "moon", THEME, 3));
    expect(unknown.calls).toEqual(meadow.calls);
    const later = draw((pen) => drawScenery(pen, AREA, "mountain", THEME, 9));
    expect(later.calls).toEqual(draw((pen) => drawScenery(pen, AREA, "mountain", THEME, 3)).calls);
  });

  it("draws nothing in an area too small to hold it", () => {
    expect(draw((pen) => drawScenery(pen, { x: 0, y: 0, w: 10, h: 4 }, "meadow", THEME, 0)).calls).toEqual([]);
  });
});
