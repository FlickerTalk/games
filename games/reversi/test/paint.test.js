import { describe, expect, it } from "vitest";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBoard, layoutFor } from "../src/paint.js";
import { initial } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const view = (extra = {}) => ({ size: 352, cells: initial().cells, time: 0, targets: [], last: null, pending: null, ...extra });
const arcsAt = (ctx, point) => ctx.calls.filter((call) => call.op === "arc" && Math.abs(call.points[0][0] - point.x) < 0.01 && Math.abs(call.points[0][1] - point.y) < 0.01);
const discsAt = (ctx, point, radius) => arcsAt(ctx, point).filter((call) => Math.abs(call.radius - radius) < 0.01).length;
const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);

describe("the Reversi board, drawn", () => {
  it("lays the board out inside its square at every size the room or a full screen can give", () => {
    for (const size of [120, 214, 300, 352, 480, 720]) {
      const { frame, grid, radius } = layoutFor(size);
      expect(grid.cell * 8).toBeCloseTo(frame.inner.w, 6);
      expect(radius).toBeCloseTo(grid.cell * 0.39, 6);
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, view({ size, targets: [19, 26, 37, 44], last: 27 })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("puts every disc on its own cell, the board never turned", () => {
    const { grid, radius } = layoutFor(352);
    const ctx = draw((pen) => drawBoard(pen, light, view()));
    for (const cell of [27, 28, 35, 36]) expect(discsAt(ctx, cellCentre(grid, cell), radius), `${cell}`).toBe(1);
    for (const cell of [0, 19, 63]) expect(discsAt(ctx, cellCentre(grid, cell), radius), `${cell}`).toBe(0);
    expect(cellCentre(grid, 0).y).toBeLessThan(cellCentre(grid, 63).y);
  });

  it("rings only the cells the user may play", () => {
    const { grid } = layoutFor(352);
    const ctx = draw((pen) => drawBoard(pen, light, view({ targets: [19, 44] })));
    expect(arcsAt(ctx, cellCentre(grid, 19)).length).toBeGreaterThan(0);
    expect(arcsAt(ctx, cellCentre(grid, 44)).length).toBeGreaterThan(0);
    expect(arcsAt(ctx, cellCentre(grid, 26))).toHaveLength(0);
  });

  it("draws a disc that turns edge-on in the middle of its turn, and the placed disc growing", () => {
    const { grid, radius } = layoutFor(352);
    const ctx = draw((pen) => drawBoard(pen, light, view({ flips: { 27: 0.5 }, placed: { cell: 28, pop: 0.2 } })));
    expect(discsAt(ctx, cellCentre(grid, 27), radius)).toBe(0);
    expect(Math.max(...arcsAt(ctx, cellCentre(grid, 27)).map((call) => call.radius))).toBeLessThan(radius * 0.5);
    expect(Math.max(...arcsAt(ctx, cellCentre(grid, 28)).map((call) => call.radius))).toBeLessThan(radius);
  });

  it("fades a disc that waits for the other phone and puts a clock on its cell", () => {
    const ctx = draw((pen) => drawBoard(pen, light, view({ pending: 27, last: 27 })));
    expect(alphas(ctx)).toContain(0.55);
    expect(colours(ctx)).toContain(light.marks.white);
  });

  it("shows a side that passes over the middle of the board, in the app's colours", () => {
    const ctx = draw((pen) => drawBoard(pen, dark, view({ pass: { side: 0, progress: 0.5 } })));
    expect(colours(ctx)).toContain(dark.ui.surface);
    expect(draw((pen) => drawBoard(pen, dark, view())).calls.length).toBeLessThan(ctx.calls.length);
  });

  it("gives the board a light rim on a dark page, and keeps the frame plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });
});
