import { describe, expect, it } from "vitest";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { confirmBox, drawBoard, layoutFor } from "../src/paint.js";
import { CELLS, SIZE } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const empty = () => Array(CELLS).fill(null);
const view = (extra = {}) => ({ size: 352, cells: empty(), time: 0, last: null, pending: null, chosen: null, entering: null, pop: null, won: null, miss: null, ...extra });
const near = (a, b) => Math.abs(a - b) < 0.01;
const stonesAt = (ctx, point, radius) => ctx.calls.filter((call) => call.op === "ellipse" && near(call.points[0][0], point.x) && near(call.points[0][1], point.y + radius * 0.12) && near(call.rx, radius)).length;
const alphaBefore = (ctx, call) => {
  const index = ctx.calls.indexOf(call);
  return ctx.calls.slice(0, index).filter((one) => one.op === "set" && one.name === "globalAlpha").at(-1)?.value ?? 1;
};

describe("the Five in a Row board, drawn", () => {
  it("lays the board out inside its square at every size the room or a full screen can give, the outer lines where the design has them", () => {
    for (const size of [120, 214, 300, 320, 352, 480, 720]) {
      const { frame, grid, radius } = layoutFor(size);
      expect(grid.cell * SIZE).toBeCloseTo(frame.inner.w, 6);
      expect(radius).toBeCloseTo(grid.cell * 0.42, 6);
      if (size >= 214) expect((cellCentre(grid, 0).x - frame.outer.x) / frame.outer.w, `${size}`).toBeCloseTo(0.065, 2);
      const cells = empty().map((_, cell) => cell % 2);
      const busy = view({ size, cells, last: 0, pending: 224, won: { cells: [0, 16, 32, 48, 64], progress: 1, cheer: 1 }, pop: { cell: 14, progress: 0.4 }, miss: { cell: 210, progress: 0.5 } });
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, busy))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("draws fifteen lines each way through the crossings, and the five star points while they are free", () => {
    const { grid } = layoutFor(352);
    const ctx = draw((pen) => drawBoard(pen, light, view()));
    const starts = ctx.calls.filter((call) => call.op === "moveTo").map((call) => call.points[0]);
    for (let at = 0; at < SIZE; at += 1) {
      const row = cellCentre(grid, at * SIZE);
      const column = cellCentre(grid, at);
      expect(starts.some(([x, y]) => near(x, row.x) && near(y, row.y)), `row ${at}`).toBe(true);
      expect(starts.some(([x, y]) => near(x, column.x) && near(y, column.y)), `column ${at}`).toBe(true);
    }
    const dots = (pen) => pen.calls.filter((call) => call.op === "arc" && [48, 56, 112, 168, 176].some((cell) => near(call.points[0][0], cellCentre(grid, cell).x) && near(call.points[0][1], cellCentre(grid, cell).y))).length;
    expect(dots(ctx)).toBe(5);
    const cells = empty();
    cells[112] = 0;
    expect(dots(draw((pen) => drawBoard(pen, light, view({ cells }))))).toBe(4);
  });

  it("puts each stone on its crossing, and the chosen crossing's stone faded under a dashed target", () => {
    const { grid, radius } = layoutFor(352);
    const cells = empty();
    cells[112] = 0;
    cells[113] = 1;
    const ctx = draw((pen) => drawBoard(pen, light, view({ cells, chosen: { cell: 97, side: 1 } })));
    expect(stonesAt(ctx, cellCentre(grid, 112), radius)).toBe(1);
    expect(stonesAt(ctx, cellCentre(grid, 113), radius)).toBe(1);
    expect(stonesAt(ctx, cellCentre(grid, 0), radius)).toBe(0);
    const [ghost] = ctx.calls.filter((call) => call.op === "ellipse" && near(call.points[0][0], cellCentre(grid, 97).x) && near(call.rx, radius));
    expect(alphaBefore(ctx, ghost)).toBeLessThan(0.6);
    expect(ctx.calls.some((call) => call.op === "arc" && near(call.points[0][0], cellCentre(grid, 97).x) && call.radius > radius * 1.3)).toBe(true);
  });

  it("draws a stone being placed smaller, and the line over the winning five as far as it has grown", () => {
    const { grid, radius } = layoutFor(352);
    const cells = empty();
    for (const cell of [0, 16, 32, 48, 64]) cells[cell] = 0;
    const growing = draw((pen) => drawBoard(pen, light, view({ cells, entering: { cell: 64, progress: 0 } })));
    expect(stonesAt(growing, cellCentre(grid, 64), radius)).toBe(0);
    expect(growing.calls.some((call) => call.op === "ellipse" && near(call.points[0][0], cellCentre(grid, 64).x) && near(call.rx, radius * 0.5))).toBe(true);
    const won = draw((pen) => drawBoard(pen, light, view({ cells, won: { cells: [0, 16, 32, 48, 64], progress: 1, cheer: 0 } })));
    const end = cellCentre(grid, 64);
    expect(won.calls.some((call) => call.op === "lineTo" && near(call.points[0][0], end.x) && near(call.points[0][1], end.y))).toBe(true);
  });

  it("gives the board a light rim on a dark page and lowers its wood, and keeps the frame plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("makes the button that confirms the chosen crossing at least 44 px across, around it and inside the board", () => {
    for (const size of [300, 320, 352, 720]) {
      const layout = layoutFor(size);
      const { outer } = layout.frame;
      for (const cell of [0, 14, 112, 210, 224]) {
        const box = confirmBox(layout, cell);
        const centre = cellCentre(layout.grid, cell);
        expect(box.w, `${size} ${cell}`).toBeGreaterThanOrEqual(Math.min(44, outer.w));
        expect(box.w).toBeCloseTo(box.h, 6);
        expect(box.x).toBeGreaterThanOrEqual(outer.x - 0.01);
        expect(box.y).toBeGreaterThanOrEqual(outer.y - 0.01);
        expect(box.x + box.w).toBeLessThanOrEqual(outer.x + outer.w + 0.01);
        expect(box.y + box.h).toBeLessThanOrEqual(outer.y + outer.h + 0.01);
        expect(centre.x).toBeGreaterThan(box.x);
        expect(centre.x).toBeLessThan(box.x + box.w);
        expect(centre.y).toBeGreaterThan(box.y);
        expect(centre.y).toBeLessThan(box.y + box.h);
      }
      const middle = confirmBox(layout, 112);
      expect(middle.x + middle.w / 2).toBeCloseTo(cellCentre(layout.grid, 112).x, 6);
    }
  });
});
