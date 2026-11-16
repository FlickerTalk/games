import { describe, expect, it } from "vitest";
import { draw, shapes } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { LOOKS } from "../src/levels.js";
import { drawScenery } from "../src/scenery.js";
import { themeFor } from "../src/theme.js";

const AREA = { x: 0, y: 0, w: 384, h: 800 };

describe("the sceneries", () => {
  it("fill the whole area first, each with its own drawing, the same at the same moment, without a word", () => {
    const seen = new Set();
    for (const name of LOOKS.track) {
      for (const theme of [themeFor(tokensFor("mono-light")), themeFor(tokensFor("mono-dark"))]) {
        const ctx = draw((pen) => drawScenery(pen, name, AREA, theme, 2));
        const first = ctx.calls.find((call) => call.op === "fillRect");
        expect(first.points, name).toEqual([[0, 0], [384, 800]]);
        expect(ctx.calls.some((call) => call.op === "fillText"), name).toBe(false);
        expect(ctx.depth, name).toBe(0);
        expect(shapes(ctx)).toEqual(shapes(draw((pen) => drawScenery(pen, name, AREA, theme, 2))));
        seen.add(shapes(ctx).join("\n"));
      }
    }
    expect(seen.size).toBe(LOOKS.track.length);
  });

  it("clip to the area they are given and fall back on the garden for a look they do not know", () => {
    const small = { x: 40, y: 60, w: 100, h: 100 };
    const ctx = draw((pen) => drawScenery(pen, "nowhere", small, themeFor(null), 0));
    expect(ctx.calls.some((call) => call.op === "clip")).toBe(true);
    expect(shapes(ctx)).toEqual(shapes(draw((pen) => drawScenery(pen, "garden", small, themeFor(null), 0))));
  });
});
