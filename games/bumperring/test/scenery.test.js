import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { VARIANTS } from "../src/arena.js";
import { PLACES } from "../src/levels.js";
import { drawPlace, drawPlatform } from "../src/scenery.js";
import { THEME, themeFor } from "../src/theme.js";

const AREA = { x: 20, y: 30, w: 384, h: 700 };

describe("the places and the platform", () => {
  it("draws each place inside its area, each its own way, without a word", () => {
    const seen = new Set();
    for (const place of PLACES) {
      const ctx = draw((pen) => drawPlace(pen, AREA, place, THEME, 1.5));
      const area = bounds(painted(ctx));
      expect(area.left, place).toBeGreaterThanOrEqual(AREA.x - 1);
      expect(area.top, place).toBeGreaterThanOrEqual(AREA.y - 1);
      expect(area.right, place).toBeLessThanOrEqual(AREA.x + AREA.w + 1);
      expect(area.bottom, place).toBeLessThanOrEqual(AREA.y + AREA.h + 1);
      expect(ctx.depth, place).toBe(0);
      expect(ctx.calls.some((call) => call.op === "fillText"), place).toBe(false);
      seen.add(shapes(ctx).join("\n"));
    }
    expect(seen.size).toBe(PLACES.length);
  });

  it("moves its waves slowly and keeps everything else still", () => {
    const [one, two] = [0, 0.5].map((time) => shapes(draw((pen) => drawPlace(pen, AREA, "pond", THEME, time))).join("\n"));
    expect(one).not.toBe(two);
  });

  it("fits a small tile as well, for the looks screen", () => {
    const tile = { x: 10, y: 10, w: 100, h: 100 };
    for (const place of PLACES) {
      const area = bounds(painted(draw((pen) => drawPlace(pen, tile, place, THEME, 0))));
      expect(area.right, place).toBeLessThanOrEqual(111);
      expect(area.bottom, place).toBeLessThanOrEqual(111);
    }
  });

  it("draws the platform as a disc seen from above, with its side under it, each kind told apart by shape", () => {
    const seen = new Set();
    for (const variant of VARIANTS) {
      const ctx = draw((pen) => drawPlatform(pen, 200, 300, 130, THEME, { variant, size: 1, bar: { x: 1, y: 0 } }));
      const area = bounds(painted(ctx));
      expect(area.left, variant).toBeGreaterThanOrEqual(200 - 130 - 4);
      expect(area.right, variant).toBeLessThanOrEqual(200 + 130 + 4);
      expect(area.top, variant).toBeGreaterThanOrEqual(300 - 130 * 0.58 - 4);
      expect(area.bottom, variant).toBeLessThanOrEqual(300 + 130 * 0.7 + 4);
      expect(ctx.depth, variant).toBe(0);
      if (variant !== "shrink") seen.add(shapes(ctx).join("\n"));
    }
    expect(seen.size).toBe(VARIANTS.length - 1);
  });

  it("shrinks the disc with the round, turns its bar, and shows the icy patch on the other side to the far seat", () => {
    const wide = (options) => {
      const area = bounds(painted(draw((pen) => drawPlatform(pen, 200, 300, 130, THEME, options))));
      return area.right - area.left;
    };
    expect(wide({ variant: "shrink", size: 0.65 })).toBeLessThan(wide({ variant: "shrink", size: 1 }) * 0.7);
    const bar = (turn) => shapes(draw((pen) => drawPlatform(pen, 200, 300, 130, THEME, { variant: "bar", bar: turn }))).join("\n");
    expect(bar({ x: 1, y: 0 })).not.toBe(bar({ x: 0, y: 1 }));
    const ice = (turn) => shapes(draw((pen) => drawPlatform(pen, 200, 300, 130, THEME, { variant: "ice", turn }))).join("\n");
    expect(ice(1)).not.toBe(ice(-1));
  });

  it("is drawn in the app's dark colours as well", () => {
    const dark = themeFor(tokensFor("ember-dark"), { dark: true });
    expect(() => draw((pen) => drawPlace(pen, AREA, "cloud", dark, 1))).not.toThrow();
    expect(() => draw((pen) => drawPlatform(pen, 200, 300, 130, dark, { variant: "trampoline" }))).not.toThrow();
  });
});
