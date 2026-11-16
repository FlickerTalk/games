import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { FORM_TOP, drawBoard, layoutFor, tileBox } from "../src/paint.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const SIZES = [120, 214, 300, 352, 480, 720];

const grids = (extra = {}) => ({
  size: 352,
  phase: "play",
  turn: 0,
  mine: { side: 0, rows: [{ word: "stare", answer: "bbybg" }, { word: "pl", typing: true }] },
  theirs: { side: 1, rows: [{ word: "about", answer: "ybbbb" }] },
  ...extra,
});
const secret = (extra = {}) => ({ size: 352, phase: "place", turn: 0, secret: { side: 0, word: "cra", typing: true }, ...extra });
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const strokes = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);

describe("the Word Duel board, drawn", () => {
  it("keeps the drawing above the typing form, inside the canvas, at every size the room or a full screen can give", () => {
    for (const size of SIZES) {
      for (const view of [grids({ size }), secret({ size })]) {
        const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, view))));
        expect(area.left, `${size} ${view.phase}`).toBeGreaterThanOrEqual(0);
        expect(area.top, `${size} ${view.phase}`).toBeGreaterThanOrEqual(0);
        expect(area.right, `${size} ${view.phase}`).toBeLessThanOrEqual(size);
        expect(area.bottom, `${size} ${view.phase}`).toBeLessThanOrEqual(size * FORM_TOP[view.phase]);
      }
    }
  });

  it("lays this side's guesses out large on the left and the other side's small beside them, six rows of five each", () => {
    for (const size of SIZES) {
      const { mine, theirs } = layoutFor(size, "play");
      expect(mine.tile).toBeGreaterThan(theirs.tile * 1.4);
      expect(mine.x + mine.w).toBeLessThan(theirs.x);
      const last = tileBox(mine, 5, 4);
      expect(last.x + last.w).toBeCloseTo(mine.x + mine.w, 6);
      expect(tileBox(theirs, 5, 4).y).toBeGreaterThan(tileBox(theirs, 0, 4).y);
    }
    expect(layoutFor(300, "play").mine.tile).toBeGreaterThanOrEqual(28);
  });

  it("writes each guess on its tiles, with the letters being typed in the next row of this side's grid", () => {
    const ctx = draw((pen) => drawBoard(pen, light, grids()));
    expect(texts(ctx)).toEqual(["S", "T", "A", "R", "E", "P", "L", "A", "B", "O", "U", "T"]);
    expect(strokes(ctx)).toContain(light.ui.accent);
    for (const mark of ["g", "y", "b"]) expect(colours(ctx)).toContain(light.tiles[mark].face);
  });

  it("outlines the grid of the side to play and sets each side's badge over its grid, ringed while it plays", () => {
    const mine = draw((pen) => drawBoard(pen, light, grids({ turn: 0 })));
    const theirs = draw((pen) => drawBoard(pen, light, grids({ turn: 1 })));
    expect(strokes(mine)).toContain(light.sides[0].deep);
    expect(strokes(mine)).not.toContain(light.sides[1].deep);
    expect(strokes(theirs)).toContain(light.sides[1].deep);
    const over = draw((pen) => drawBoard(pen, light, grids({ turn: null })));
    expect(strokes(over)).not.toContain(light.sides[0].deep);
    expect(strokes(over)).not.toContain(light.sides[1].deep);
    for (const side of [0, 1]) expect(colours(over)).toContain(light.sides[side].body);
  });

  it("fades a guess still on its way and sets a clock on it", () => {
    const view = grids({ mine: { side: 0, rows: [{ word: "stare", pending: true }] } });
    const ctx = draw((pen) => drawBoard(pen, light, view));
    const alphas = ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    expect(alphas.some((alpha) => alpha < 0.7)).toBe(true);
    expect(ctx.calls.filter((call) => call.op === "arc").length).toBeGreaterThan(0);
  });

  it("shows the secret word alone while it is chosen, this side's badge over it", () => {
    const ctx = draw((pen) => drawBoard(pen, light, secret()));
    expect(texts(ctx)).toEqual(["C", "R", "A"]);
    expect(colours(ctx)).toContain(light.sides[0].body);
    const kept = draw((pen) => drawBoard(pen, light, secret({ turn: 1, secret: { side: 0, word: "crane", answer: "ggggg" } })));
    expect(texts(kept)).toEqual(["C", "R", "A", "N", "E"]);
    expect(colours(kept)).toContain(light.tiles.g.face);
    const { row } = layoutFor(352, "place");
    expect(row.tile).toBeGreaterThan(layoutFor(352, "play").mine.tile);
  });

  it("lowers the bare blocks on a dark page and keeps the answers in their full colour", () => {
    const ctx = draw((pen) => drawBoard(pen, dark, grids()));
    expect(colours(ctx)).toContain(dark.board.face);
    expect(colours(ctx)).not.toContain(light.board.face);
    expect(colours(ctx)).toContain(light.tiles.y.face);
  });
});
