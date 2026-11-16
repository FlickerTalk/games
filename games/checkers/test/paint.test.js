import { describe, expect, it } from "vitest";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBoard, layoutFor } from "../src/paint.js";
import { initial } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const view = (extra = {}) => ({ size: 352, flipped: false, cells: initial().cells, time: 0, ...extra });
const discsAt = (ctx, point, radius) => ctx.calls.filter((call) => call.op === "arc" && Math.abs(call.points[0][0] - point.x) < 0.01 && Math.abs(call.points[0][1] - point.y - radius * 0.08) < 0.01 && Math.abs(call.radius - radius) < 0.01).length;

describe("the checkers board, drawn", () => {
  it("lays the board out inside its square at every size the room or a full screen can give", () => {
    for (const size of [120, 214, 300, 352, 480, 720]) {
      const { frame, grid, radius } = layoutFor(size);
      expect(grid.cell * 8).toBeCloseTo(frame.inner.w, 6);
      expect(radius).toBeCloseTo(grid.cell * 0.36, 6);
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, view({ size })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("puts every piece on its own square, turned for the side that plays from the top", () => {
    const { grid, radius } = layoutFor(352);
    const straight = draw((ctx) => drawBoard(ctx, light, view()));
    expect(discsAt(straight, cellCentre(grid, 1), radius)).toBe(1);
    expect(discsAt(straight, cellCentre(grid, 62), radius)).toBe(1);
    expect(discsAt(straight, cellCentre(grid, 28), radius)).toBe(0);
    const turned = draw((ctx) => drawBoard(ctx, light, view({ flipped: true })));
    expect(discsAt(turned, cellCentre(grid, 1, { flipped: true }), radius)).toBe(1);
    expect(cellCentre(grid, 1, { flipped: true }).y).toBeGreaterThan(cellCentre(grid, 62, { flipped: true }).y);
  });

  it("draws the moving piece on its way instead of on its square, high over a jump, the piece it takes still there", () => {
    const { grid, radius } = layoutFor(352);
    const cells = Array(64).fill(null);
    cells[49] = 0;
    const moving = { piece: 0, path: [21, 35, 49], hops: [true, true], progress: 0.25, crown: null };
    const ctx = draw((pen) => drawBoard(pen, light, view({ cells, hidden: [49], moving, standing: [{ cell: 42, piece: 1 }] })));
    expect(discsAt(ctx, cellCentre(grid, 49), radius)).toBe(0);
    expect(discsAt(ctx, cellCentre(grid, 42), radius)).toBe(1);
    const halfway = cellCentre(grid, 28);
    const lifted = ctx.calls.filter((call) => call.op === "arc" && Math.abs(call.points[0][0] - halfway.x) < 0.5 && call.points[0][1] < halfway.y - radius * 0.3);
    expect(lifted.length).toBeGreaterThan(0);
  });

  it("gives the board a light rim on a dark page and lowers its wood, and keeps the frame plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("draws a piece held by a finger where the finger is, lifted off the board", () => {
    const { radius } = layoutFor(352);
    const ctx = draw((pen) => drawBoard(pen, light, view({ hidden: [21], floating: { piece: 0, x: 200, y: 150, lift: 6 } })));
    expect(discsAt(ctx, { x: 200, y: 144 }, radius)).toBe(1);
  });
});
