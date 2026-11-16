import { describe, expect, it } from "vitest";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { layoutFor } from "../src/layout.js";
import { TILE, drawBoard } from "../src/paint.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const GRID = [..."catsoxeetnrfdlmp"];
const view = (extra = {}) => ({ size: 343, phase: "play", grid: GRID, trace: null, can: [], last: [], pending: null, hops: [], shake: null, burst: null, ...extra });
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText");

describe("the Letter Grid, drawn", () => {
  it("draws the wooden board between the rows, inside its square, at every size the room or a full screen can give", () => {
    for (const size of [120, 214, 300, 343, 480, 720]) {
      for (const phase of ["shuffle", "play", "done"]) {
        const { area } = layoutFor(size, phase);
        const ctx = draw((pen) => drawBoard(pen, light, view({ size, phase, grid: phase === "shuffle" ? null : GRID })));
        const drawn = bounds(painted(ctx));
        expect(drawn.left, `${size} ${phase}`).toBeGreaterThanOrEqual(0);
        expect(drawn.right, `${size} ${phase}`).toBeLessThanOrEqual(size);
        expect(drawn.top, `${size} ${phase}`).toBeGreaterThanOrEqual(area.y);
        expect(drawn.bottom, `${size} ${phase}`).toBeLessThanOrEqual(area.y + area.h);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("puts each letter on its own tile, in reading order, and no letter while the letters are being drawn", () => {
    const { grid } = layoutFor(343, "play");
    const letters = texts(draw((ctx) => drawBoard(ctx, light, view())));
    expect(letters.map((call) => call.text).join("")).toBe(GRID.join("").toUpperCase());
    letters.forEach((call, cell) => {
      const centre = cellCentre(grid, cell);
      expect(call.points[0][0]).toBeCloseTo(centre.x, 6);
      expect(Math.abs(call.points[0][1] - centre.y)).toBeLessThan(grid.cell * 0.05);
    });
    expect(texts(draw((ctx) => drawBoard(ctx, light, view({ phase: "shuffle", grid: null }))))).toHaveLength(0);
  });

  it("draws the traced tiles over the ribbon, numbered, the ribbon over the other tiles", () => {
    const ctx = draw((pen) => drawBoard(pen, light, view({ trace: { side: 0, path: [0, 5, 6] }, can: [1, 2, 7, 10, 11] })));
    const fills = colours(ctx);
    expect(fills.lastIndexOf(light.board.face)).toBeLessThan(fills.indexOf(light.sides[0].body));
    expect(texts(ctx).map((call) => call.text).slice(-6)).toEqual(["C", "1", "X", "2", "E", "3"]);
  });

  it("writes nothing on the board but its letters and the digits of a word's order", () => {
    const busy = view({ trace: { side: 1, path: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9] }, can: [12, 13, 14], last: [10, 11, 15], pending: 15, hops: [{ cell: 10, progress: 0.4 }], shake: { cells: [0, 1], progress: 0.3 }, burst: { cell: 15, progress: 0.5, side: 0 } });
    for (const one of texts(draw((ctx) => drawBoard(ctx, light, busy)))) expect(one.text).toMatch(/^([A-ZÑ]|\d+)$/);
  });

  it("gives the board a light rim on a dark page, and keeps it plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("draws the tiles a little smaller than their cells, with room between them", () => {
    expect(TILE).toBeGreaterThan(0.8);
    expect(TILE).toBeLessThan(1);
  });
});
