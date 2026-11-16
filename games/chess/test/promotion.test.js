import { describe, expect, it } from "vitest";
import { gridIn } from "../../../kit/src/tabletop/grid.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { PROMOTIONS, drawPromotion, promotionLayout } from "../src/promotion.js";
import { themeFor } from "../src/theme.js";

const grid = gridIn({ x: 8, y: 8, w: 304, h: 304 }, { columns: 8 });

describe("the choice of a promoted piece", () => {
  it("offers the queen, the rook, the bishop and the knight, in that order, as four big targets across the middle of the board", () => {
    expect(PROMOTIONS).toEqual(["q", "r", "b", "n"]);
    const { panel, choices } = promotionLayout(grid);
    expect(choices.map((one) => one.type)).toEqual(PROMOTIONS);
    for (const { box } of choices) {
      expect(box.w).toBeGreaterThanOrEqual(2 * grid.cell - 0.01);
      expect(box.h).toBeGreaterThanOrEqual(2 * grid.cell - 0.01);
      expect(box.x).toBeGreaterThanOrEqual(grid.x - 0.01);
      expect(box.x + box.w).toBeLessThanOrEqual(grid.x + grid.w + 0.01);
      expect(box.y).toBeGreaterThanOrEqual(panel.y);
      expect(box.y + box.h).toBeLessThanOrEqual(panel.y + panel.h);
    }
    expect(panel.y).toBeGreaterThan(grid.y + 2 * grid.cell);
    expect(panel.y + panel.h).toBeLessThan(grid.y + 6 * grid.cell);
    expect(choices[1].box.x).toBeGreaterThanOrEqual(choices[0].box.x + choices[0].box.w - 0.01);
  });

  it("veils the board and draws the four pieces of the user's colour on a panel in the app's colours, inside the board", () => {
    for (const dark of [false, true]) {
      const theme = themeFor(null, { dark });
      for (const side of [0, 1]) {
        const ctx = draw((pen) => drawPromotion(pen, theme, grid, side));
        const seen = colours(ctx);
        expect(seen).toEqual(expect.arrayContaining([theme.ui.shade, theme.ui.surface, theme.ui.border, theme.pieces[side].fill]));
        expect(seen).not.toContain(theme.pieces[1 - side].fill);
        const area = bounds(painted(ctx));
        expect(area.left).toBeGreaterThanOrEqual(grid.x - 0.01);
        expect(area.right).toBeLessThanOrEqual(grid.x + grid.w + 0.01);
        expect(ctx.depth).toBe(0);
      }
    }
  });
});
