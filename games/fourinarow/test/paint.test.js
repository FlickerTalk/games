import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { columnBox, drawBoard, holeCentre, layoutFor } from "../src/paint.js";
import { initial, play, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const dropped = (columns) => columns.reduce((state, column) => play(state, column, turn(state)).state, initial());
const view = (extra = {}) => ({ size: 352, cells: initial().cells, time: 0, open: [], chosen: null, last: null, pending: false, line: null, glow: 0, hidden: [], falling: null, burst: null, ...extra });
const BODIES = [light.pieces[0].body, light.pieces[1].body];
const discsAt = (ctx, point, radius) =>
  ctx.calls.filter((call, at) => call.op === "arc" && Math.abs(call.points[0][0] - point.x) < 0.01 && Math.abs(call.points[0][1] - point.y) < 0.01 && Math.abs(call.radius - radius) < 0.01 && BODIES.includes(ctx.calls[at + 1]?.value)).length;
const fills = (ctx, colour) => ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle" && call.value === colour).length;

describe("the Four in a Row board, drawn", () => {
  it("stands the frame and the space above it for a falling disc inside its square at every size the room or a full screen can give", () => {
    for (const size of [120, 214, 300, 308, 352, 480, 720]) {
      const layout = layoutFor(size);
      expect(layout.w).toBeCloseTo(layout.cell * 7, 6);
      expect(layout.radius).toBeCloseTo(layout.cell * 0.39, 6);
      const falling = { side: 0, column: 0, row: -1.05 };
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, dark, view({ size, falling, open: [0, 1, 2, 3, 4, 5, 6], chosen: 6, time: 0.3 })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("lays the seven columns side by side over the frame, each from the top of the square to the bottom of the frame", () => {
    const layout = layoutFor(352);
    const boxes = [0, 1, 2, 3, 4, 5, 6].map((column) => columnBox(layout, column));
    expect(boxes[0].x).toBeCloseTo(layout.x, 6);
    expect(boxes[6].x + boxes[6].w).toBeCloseTo(layout.x + layout.w, 6);
    for (const box of boxes) {
      expect(box.w).toBeCloseTo(layout.cell, 6);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeLessThan(layout.y - layout.cell * 0.5);
      expect(box.y + box.h).toBeCloseTo(layout.y + layout.h, 6);
    }
    expect(holeCentre(layout, 38).x).toBeCloseTo(boxes[3].x + layout.cell / 2, 6);
    expect(holeCentre(layout, 38).y).toBeGreaterThan(holeCentre(layout, 3).y);
  });

  it("puts every disc in its own hole, the first one dropped in the bottom row", () => {
    const layout = layoutFor(352);
    const ctx = draw((pen) => drawBoard(pen, light, view({ cells: dropped([3, 3, 0]).cells })));
    for (const cell of [38, 31, 35]) expect(discsAt(ctx, holeCentre(layout, cell), layout.radius), `${cell}`).toBe(1);
    expect(discsAt(ctx, holeCentre(layout, 24), layout.radius)).toBe(0);
  });

  it("draws the falling disc on its way down the column instead of in its hole", () => {
    const layout = layoutFor(352);
    const cells = dropped([3]).cells;
    const ctx = draw((pen) => drawBoard(pen, light, view({ cells, hidden: [38], falling: { side: 0, column: 3, row: 2 } })));
    expect(discsAt(ctx, holeCentre(layout, 38), layout.radius)).toBe(0);
    expect(discsAt(ctx, holeCentre(layout, 17), layout.radius)).toBe(1);
  });

  it("points an arrow into each column the user may play, and none out of turn", () => {
    const count = (open) => fills(draw((ctx) => drawBoard(ctx, light, view({ open }))), light.ui.muted);
    expect(count([0, 1, 2, 3, 4, 5, 6])).toBe(7);
    expect(count([1, 2])).toBe(2);
    expect(count([])).toBe(0);
  });

  it("keeps the arrow and a dashed frame on the column being played while its disc falls, once the turn has passed", () => {
    const ctx = draw((pen) => drawBoard(pen, light, view({ open: [], chosen: 2, falling: { side: 0, column: 2, row: 1 } })));
    expect(fills(ctx, light.ui.accent)).toBe(1);
    expect(fills(ctx, light.ui.muted)).toBe(0);
    expect(ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length)).toBe(true);
  });

  it("rings the winning four and draws their line, the last-move ring only before a win", () => {
    const won = dropped([3, 4, 3, 4, 3, 4, 3]);
    const winning = draw((ctx) => drawBoard(ctx, light, view({ cells: won.cells, last: 17, line: [17, 24, 31, 38] })));
    const layout = layoutFor(352);
    const rings = winning.calls.filter((call) => call.op === "arc" && Math.abs(call.radius - layout.radius * 1.15) < 0.01).length;
    expect(rings).toBe(4);
    expect(winning.calls.some((call) => call.op === "setLineDash" && call.segments.length)).toBe(false);
    const playing = draw((ctx) => drawBoard(ctx, light, view({ cells: dropped([3, 4]).cells, last: 39 })));
    expect(playing.calls.some((call) => call.op === "setLineDash" && call.segments.length)).toBe(true);
  });

  it("gives the frame a light rim on a dark page, and keeps it plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("rims a falling disc on a dark page only while it is still above the frame", () => {
    const rims = (row) => draw((ctx) => drawBoard(ctx, dark, view({ falling: { side: 0, column: 3, row } }))).calls.filter((call) => call.op === "set" && call.name === "strokeStyle" && call.value === dark.rim).length;
    expect(rims(-1)).toBe(rims(2) + 1);
  });
});
