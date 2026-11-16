import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { cellCentreOf, drawBoard, layoutFor } from "../src/paint.js";
import { initial, play, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });

function after(...cells) {
  let state = initial();
  for (const cell of cells) state = play(state, cell, turn(state)).state;
  return state;
}

const view = (extra = {}) => ({ size: 352, cells: initial().cells, side: 0, open: [], last: null, pending: false, placing: null, miss: null, win: null, ...extra });
const near = (a, b, slack = 0.01) => Math.abs(a - b) < slack;
const ringsAt = (ctx, point, radius) => ctx.calls.filter((call) => call.op === "arc" && near(call.points[0][0], point.x) && near(call.points[0][1], point.y) && near(call.radius, radius)).length;
const mouths = (ctx, radius) => ctx.calls.filter((call) => call.op === "arc" && near(call.radius, radius)).length;

describe("the Tic-Tac-Toe board, drawn", () => {
  it("lays the board out inside its square at every size the room or a full screen can give, with nine equal cells", () => {
    for (const size of [120, 200, 300, 352, 480, 720]) {
      const { frame, cell, gap } = layoutFor(size);
      expect(cell * 3 + gap * 3).toBeCloseTo(frame.inner.w, 6);
      expect(gap).toBeCloseTo(frame.outer.w * 0.024, 6);
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, view({ size, cells: after(4, 0, 8).cells, last: 8 })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("puts each piece at the centre of its own cell, in reading order", () => {
    const { piece } = layoutFor(352);
    const ctx = draw((pen) => drawBoard(pen, light, view({ cells: after(4, 0, 8, 2).cells })));
    expect(ringsAt(ctx, cellCentreOf(352, 0), piece * 0.32)).toBe(2);
    expect(ringsAt(ctx, cellCentreOf(352, 2), piece * 0.32)).toBe(2);
    expect(ringsAt(ctx, cellCentreOf(352, 4), piece * 0.32)).toBe(0);
    expect(cellCentreOf(352, 2).x).toBeGreaterThan(cellCentreOf(352, 0).x);
    expect(cellCentreOf(352, 6).y).toBeGreaterThan(cellCentreOf(352, 0).y);
  });

  it("shows the free cells the user may play, in the colour of the user's side, and nothing to play out of turn", () => {
    const { cell } = layoutFor(352);
    const dots = (ctx) => ctx.calls.filter((call) => call.op === "arc" && near(call.radius, cell * 0.22)).length;
    const mine = draw((ctx) => drawBoard(ctx, light, view({ cells: after(4).cells, side: 1, open: [0, 1, 2, 3, 5, 6, 7, 8] })));
    expect(dots(mine)).toBe(8);
    expect(colours(mine)).toContain(light.pieces[1].ring);
    expect(dots(draw((ctx) => drawBoard(ctx, light, view({ cells: after(4).cells }))))).toBe(0);
  });

  it("draws the winning line as a ribbon, the winner's pieces cheering and the loser's surprised", () => {
    const { piece } = layoutFor(352);
    const won = after(0, 3, 1, 4, 2);
    const calm = draw((ctx) => drawBoard(ctx, light, view({ cells: won.cells })));
    const ended = draw((ctx) => drawBoard(ctx, light, view({ cells: won.cells, win: { line: [0, 1, 2], winner: 0, ribbon: 1, cheer: 0.5, tilt: 0 } })));
    expect(mouths(calm, piece * 0.11)).toBe(5);
    expect(mouths(ended, piece * 0.11)).toBe(3);
    expect(colours(ended)).toContain(light.pieces[0].hue);
    const barTop = (ctx) => {
      const centre = cellCentreOf(352, 0);
      return ctx.calls.find((call) => call.op === "moveTo" && near(call.points[0][0], centre.x - piece * 0.32, 0.05)).points[0][1];
    };
    expect(barTop(calm)).toBeCloseTo(cellCentreOf(352, 0).y - piece * 0.32, 3);
    expect(barTop(ended)).toBeLessThan(barTop(calm) - 1);
  });

  it("gives the board a light rim on a dark page with its chalk lines at dusk, and keeps the frame plain on a light one", () => {
    const strokes = (theme) => colours(draw((ctx) => drawBoard(ctx, theme, view())));
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(dark)).toContain(dark.grid.line);
    expect(strokes(dark)).not.toContain(light.grid.line);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("shakes only the taken cell that was tapped", () => {
    const { cell } = layoutFor(352);
    const corner = (index, shift = 0) => {
      const centre = cellCentreOf(352, index);
      return [centre.x - cell / 2 + cell * 0.18 + shift, centre.y - cell / 2];
    };
    const starts = (ctx, [x, y]) => ctx.calls.some((call) => call.op === "moveTo" && near(call.points[0][0], x, 0.05) && near(call.points[0][1], y, 0.05));
    const shaken = draw((ctx) => drawBoard(ctx, light, view({ cells: after(4).cells, miss: { cell: 4, shake: 0.04, ring: 0.3 } })));
    expect(starts(shaken, corner(4, cell * 0.04))).toBe(true);
    expect(starts(shaken, corner(4))).toBe(false);
    expect(starts(shaken, corner(0))).toBe(true);
  });
});
