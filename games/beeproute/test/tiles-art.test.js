import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawBattery, drawTile } from "../src/tiles-art.js";
import { THEME, themeFor } from "../src/theme.js";

const KINDS = [".", "#", "~", "B", "G", "D"];
const tile = (kind, options = {}, theme = THEME) => draw((ctx) => drawTile(ctx, kind, 100, 200, 48, theme, { world: "workshop", time: 0.4, ...options }));

describe("the tiles", () => {
  it("each draw inside their square, leaving the drawing state as they found it", () => {
    for (const kind of KINDS) {
      for (const world of ["workshop", "garden", "space"]) {
        const ctx = tile(kind, { world });
        const box = bounds(painted(ctx));
        expect(box.left, `${kind} ${world}`).toBeGreaterThanOrEqual(99);
        expect(box.top, `${kind} ${world}`).toBeGreaterThanOrEqual(199);
        expect(box.right, `${kind} ${world}`).toBeLessThanOrEqual(149);
        expect(box.bottom, `${kind} ${world}`).toBeLessThanOrEqual(249);
        expect(ctx.depth).toBe(0);
      }
    }
    const open = tile("D", { open: true });
    expect(bounds(painted(open)).top).toBeLessThan(200);
  });

  it("look different from each other and in each world", () => {
    const drawn = KINDS.map((kind) => shapes(tile(kind)).join("\n"));
    expect(new Set(drawn).size).toBe(KINDS.length);
    expect(shapes(tile(".", { world: "garden" }))).not.toEqual(shapes(tile(".", { world: "space" })));
  });

  it("show a door open or shut, a battery taken, and a goal that wakes once every battery is in", () => {
    expect(shapes(tile("D", { open: true }))).not.toEqual(shapes(tile("D")));
    expect(shapes(tile("B", { collected: true }))).not.toEqual(shapes(tile("B")));
    expect(shapes(tile("G", { powered: false }))).not.toEqual(shapes(tile("G", { powered: true })));
  });

  it("keep their shapes in a dark theme, only the floor's colour changes", () => {
    const dark = themeFor(tokensFor("mono-dark"));
    for (const kind of KINDS) expect(shapes(tile(kind, {}, dark)), kind).toEqual(shapes(tile(kind)));
  });

  it("draw a battery that bobs a little around its centre", () => {
    const one = bounds(painted(draw((ctx) => drawBattery(ctx, 50, 50, 40, THEME, 0))));
    const two = bounds(painted(draw((ctx) => drawBattery(ctx, 50, 50, 40, THEME, 0.5))));
    expect(one.top).not.toBe(two.top);
    expect(Math.abs(one.top - two.top)).toBeLessThan(3);
  });
});
