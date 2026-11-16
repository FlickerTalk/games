import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { SCENERIES } from "../src/levels.js";
import { playLayout } from "../src/layout.js";
import { drawScenery, drawStallBack, drawStallFront } from "../src/scenery.js";
import { THEME } from "../src/theme.js";

const AREA = { x: 20, y: 40, w: 360, h: 600 };

describe("the fairs and the stall", () => {
  it("fills its area with each of the three fairs, each its own picture, never outside it", () => {
    const seen = new Set();
    for (const scenery of SCENERIES) {
      const ctx = draw((pen) => drawScenery(pen, AREA, scenery, THEME, 1));
      expect(ctx.depth, scenery).toBe(0);
      expect(ctx.calls.find((call) => call.op === "clip"), scenery).toBeDefined();
      const first = ctx.calls.find((call) => call.op === "fillRect");
      expect(first.points).toEqual([[20, 40], [380, 640]]);
      seen.add(shapes(ctx).join("|"));
    }
    expect(seen.size).toBe(3);
  });

  it("keeps a fair's clouds in proportion on a small card", () => {
    const widest = (area) => {
      const arcs = draw((pen) => drawScenery(pen, area, "day", THEME, 0)).calls.filter((call) => call.op === "arc");
      return Math.max(...arcs.map((call) => call.radius));
    };
    expect(widest({ x: 0, y: 0, w: 90, h: 90 })).toBeLessThan(widest(AREA) / 3);
  });

  it("draws the stall's posts behind the balloons and its awning and counter in front, inside the stall", () => {
    for (const [width, height] of [[384, 801], [360, 343], [1280, 748]]) {
      const layout = playLayout(width, height, { fill: true });
      const { stage } = layout;
      for (const part of [drawStallBack, drawStallFront]) {
        const ctx = draw((pen) => part(pen, layout, "evening", THEME));
        const area = bounds(painted(ctx));
        expect(ctx.depth).toBe(0);
        expect(area.left, `${width}`).toBeGreaterThanOrEqual(stage.x - 6);
        expect(area.right, `${width}`).toBeLessThanOrEqual(stage.x + stage.w + 6);
        expect(area.top, `${width}`).toBeGreaterThanOrEqual(stage.y - 2);
        expect(area.bottom, `${width}`).toBeLessThanOrEqual(stage.y + stage.h + 2);
      }
    }
  });

  it("covers the counter and the awning's band, where balloons come from and go", () => {
    const layout = playLayout(384, 801, { fill: true });
    const area = bounds(painted(draw((pen) => drawStallFront(pen, layout, "day", THEME))));
    expect(area.top).toBeLessThanOrEqual(layout.stage.y + 2);
    expect(area.bottom).toBeGreaterThanOrEqual(layout.stage.y + layout.stage.h - 6);
  });

  it("hangs lights under the awning at the evening fair only", () => {
    const layout = playLayout(384, 801, { fill: true });
    const arcs = (scenery) => draw((pen) => drawStallFront(pen, layout, scenery, THEME)).calls.filter((call) => call.op === "arc").length;
    expect(arcs("evening")).toBe(arcs("day") + 9);
  });
});
