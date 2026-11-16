import { describe, expect, it } from "vitest";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBoard, layoutFor } from "../src/paint.js";
import { START } from "../src/rules.js";
import { cellOf, cellsOf } from "../src/squares.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const SIZE = 320;
const view = (extra = {}) => ({ size: SIZE, flipped: false, cells: cellsOf(START), ...extra });
const near = (a, b) => Math.abs(a - b) < 0.01;

function basesAt(ctx, point, size) {
  const scale = size / 100;
  const moves = ctx.calls.filter((call) => call.op === "moveTo").map((call) => call.points[0]);
  const white = moves.filter(([x, y]) => near(x, point.x - 25 * scale) && near(y, point.y + 31 * scale)).length;
  const black = moves.filter(([x, y]) => near(x, point.x - 26 * scale) && near(y, point.y + 31 * scale)).length;
  return { white, black };
}

const centre = (square, options) => cellCentre(layoutFor(SIZE).grid, cellOf(square), options);
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText");

describe("the chess board, drawn", () => {
  it("lays the board out inside its square at every size the room or a full screen can give", () => {
    for (const size of [120, 214, 300, 320, 480, 720]) {
      const { frame, grid, piece } = layoutFor(size);
      expect(grid.cell * 8).toBeCloseTo(frame.inner.w, 6);
      expect(piece).toBeCloseTo(grid.cell * 0.9, 6);
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, view({ size })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("puts every piece on its own square, seen from white or turned for black", () => {
    const { piece } = layoutFor(SIZE);
    const straight = draw((ctx) => drawBoard(ctx, light, view()));
    expect(basesAt(straight, centre("e1"), piece)).toEqual({ white: 1, black: 0 });
    expect(basesAt(straight, centre("e8"), piece)).toEqual({ white: 0, black: 1 });
    expect(basesAt(straight, centre("e4"), piece)).toEqual({ white: 0, black: 0 });
    const turned = draw((ctx) => drawBoard(ctx, light, view({ flipped: true })));
    expect(basesAt(turned, centre("e1", { flipped: true }), piece)).toEqual({ white: 1, black: 0 });
    expect(centre("e1", { flipped: true }).y).toBeLessThan(centre("e8", { flipped: true }).y);
  });

  it("writes the files along the bottom and the ranks down the left side, small, from the side the board is seen", () => {
    const { grid } = layoutFor(SIZE);
    const straight = texts(draw((ctx) => drawBoard(ctx, light, view())));
    expect(straight.map((call) => call.text).join("")).toBe("abcdefgh87654321");
    const turned = texts(draw((ctx) => drawBoard(ctx, light, view({ flipped: true }))));
    expect(turned.map((call) => call.text).join("")).toBe("hgfedcba12345678");
    for (const call of straight) {
      const [x, y] = call.points[0];
      expect(x).toBeGreaterThan(grid.x);
      expect(y).toBeLessThan(grid.y + grid.h);
    }
  });

  it("draws a moving piece on its way instead of on its square, the piece it takes still standing", () => {
    const { piece } = layoutFor(SIZE);
    const cells = cellsOf("rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2");
    const moving = [{ piece: "P", from: cellOf("e4"), to: cellOf("d5"), progress: 0.5 }];
    const ctx = draw((pen) => drawBoard(pen, light, view({ cells, hidden: [cellOf("d5")], moving, standing: [{ cell: cellOf("d5"), piece: "p" }] })));
    expect(basesAt(ctx, centre("d5"), piece)).toEqual({ white: 0, black: 1 });
    const [from, to] = [centre("e4"), centre("d5")];
    expect(basesAt(ctx, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, piece).white).toBe(1);
  });

  it("draws a piece held by a finger where the finger is, and shakes a piece in its square", () => {
    const { piece } = layoutFor(SIZE);
    const held = draw((ctx) => drawBoard(ctx, light, view({ hidden: [cellOf("g1")], floating: { piece: "N", x: 200, y: 150, lift: 6 } })));
    expect(basesAt(held, { x: 200, y: 144 }, piece).white).toBe(1);
    expect(basesAt(held, centre("g1"), piece).white).toBe(0);
    const shaken = draw((ctx) => drawBoard(ctx, light, view({ shakes: [{ cell: cellOf("a1"), offset: 0.5 }] })));
    expect(basesAt(shaken, centre("a1"), piece).white).toBe(0);
  });

  it("marks the chosen piece, its targets, the last move and a king in check", () => {
    const seen = colours(draw((ctx) => drawBoard(ctx, light, view({ selected: cellOf("e2"), targets: [{ cell: cellOf("e4"), capture: false }, { cell: cellOf("d3"), capture: true }], last: [cellOf("d7"), cellOf("d5")], check: cellOf("e1") }))));
    expect(seen).toEqual(expect.arrayContaining([light.marks.chosen, light.marks.dot, light.marks.take]));
    const plain = colours(draw((ctx) => drawBoard(ctx, light, view())));
    expect(plain).not.toContain(light.marks.dot);
    expect(plain).not.toContain(light.marks.take);
  });

  it("gives the board and the dark pieces a light rim on a dark page, and keeps them plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark).filter((colour) => colour === dark.rim).length).toBeGreaterThan(16);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("lays the choice of a promoted piece over everything else", () => {
    const ctx = draw((pen) => drawBoard(pen, light, view({ promoting: 0 })));
    const fills = ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle").map((call) => call.value);
    const veil = fills.indexOf(light.ui.shade);
    expect(veil).toBeGreaterThan(fills.lastIndexOf(light.board.dark));
  });
});
