import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawLookArt, drawLooks } from "../src/looks-art.js";
import { LOOKS } from "../src/levels.js";
import { THEME } from "../src/theme.js";
import { makeGame } from "./harness.js";

const area = { x: 10, y: 10, w: 100, h: 100 };

describe("the looks' art", () => {
  it("draws every vehicle and paint ball inside its card, each its own", () => {
    const all = Object.entries(LOOKS).flatMap(([kind, looks]) => looks.map((look) => draw((ctx) => drawLookArt(ctx, area, kind, look, THEME, 0.4))));
    expect(new Set(all.map((ctx) => shapes(ctx).join("|"))).size).toBe(all.length);
    for (const ctx of all) {
      const box = bounds(painted(ctx));
      expect(box.left).toBeGreaterThanOrEqual(area.x - 2);
      expect(box.right).toBeLessThanOrEqual(area.x + area.w + 2);
      expect(ctx.depth).toBe(0);
    }
  });

  it("finds the kind of a look by itself when it is not given", () => {
    expect(shapes(draw((ctx) => drawLookArt(ctx, area, null, "duck", THEME, 0.4)))).toEqual(shapes(draw((ctx) => drawLookArt(ctx, area, "ship", "duck", THEME, 0.4))));
  });

  it("draws the kinds first, then a kind's looks with the ones still to come wrapped", async () => {
    const { game } = await makeGame();
    const kinds = draw((ctx) => drawLooks(ctx, { ...game.state, looks: null }, THEME, 0.4));
    const tanks = draw((ctx) => drawLooks(ctx, { ...game.state, looks: "tank" }, THEME, 0.4));
    expect(kinds.depth).toBe(0);
    expect(tanks.depth).toBe(0);
    expect(shapes(kinds)).not.toEqual(shapes(tanks));
  });
});
