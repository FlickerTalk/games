import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { SCENERIES } from "../src/levels.js";
import { drawScenery } from "../src/scenery.js";
import { THEME } from "../src/theme.js";

const AREA = { x: 20, y: 40, w: 360, h: 600 };

describe("the three places", () => {
  it("fill their area, each its own picture, clipped to it", () => {
    const seen = new Set();
    for (const scenery of SCENERIES) {
      const ctx = draw((pen) => drawScenery(pen, AREA, scenery, THEME, 1));
      expect(ctx.depth, scenery).toBe(0);
      expect(ctx.calls.find((call) => call.op === "clip"), scenery).toBeDefined();
      const first = ctx.calls.find((call) => call.op === "fillRect");
      expect(first.points, scenery).toEqual([[20, 40], [380, 640]]);
      seen.add(shapes(ctx).join("|"));
    }
    expect(seen.size).toBe(3);
  });

  it("put the ground where the knights stand", () => {
    for (const scenery of SCENERIES) {
      const ground = (horizon) => {
        const rects = draw((pen) => drawScenery(pen, AREA, scenery, THEME, 0, { horizon })).calls.filter((call) => call.op === "fillRect");
        return rects.some((call) => Math.abs(call.points[0][1] - (AREA.y + horizon)) < 1 && call.points[1][1] >= AREA.y + AREA.h - 1);
      };
      expect(ground(300), scenery).toBe(true);
      expect(ground(450), scenery).toBe(true);
    }
  });

  it("keep their details in proportion on a small card", () => {
    for (const scenery of SCENERIES) {
      const ctx = draw((pen) => drawScenery(pen, { x: 0, y: 0, w: 90, h: 90 }, scenery, THEME, 0));
      const widths = ctx.calls.filter((call) => call.op === "set" && call.name === "lineWidth").map((call) => call.value);
      expect(Math.max(0, ...widths), scenery).toBeLessThanOrEqual(3);
      expect(bounds(painted(ctx)).left, scenery).toBeGreaterThanOrEqual(-60);
    }
  });
});
