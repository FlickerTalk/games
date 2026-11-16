import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/avatars/recorder.js";
import { pieceOf } from "../src/pieces.js";
import { THEME } from "../src/theme.js";
import { drawLifted, drawPiece, drawPieceCentred, drawTile } from "../src/tiles.js";

const themed = new Set(JSON.stringify(THEME).match(/#[0-9A-F]{6}|rgba\([^)]*\)/g));

describe("a tile", () => {
  it("stays inside its square at any size", () => {
    for (const size of [18, 41, 64]) {
      for (const family of [0, 1, 2, 3]) {
        const box = bounds(painted(draw((ctx) => drawTile(ctx, 100, 50, size, family, THEME))));
        expect(box.left).toBeGreaterThanOrEqual(100);
        expect(box.top).toBeGreaterThanOrEqual(50);
        expect(box.right).toBeLessThanOrEqual(100 + size);
        expect(box.bottom).toBeLessThanOrEqual(50 + size);
      }
    }
  });

  it("carries a motif of its own for each family, so shape tells them apart without colour", () => {
    const drawn = [0, 1, 2, 3].map((family) => shapes(draw((ctx) => drawTile(ctx, 0, 0, 40, family, THEME))).join("\n"));
    expect(new Set(drawn).size).toBe(4);
  });

  it("takes every colour from the theme", () => {
    for (const family of [0, 1, 2, 3]) for (const colour of colours(draw((ctx) => drawTile(ctx, 0, 0, 40, family, THEME)))) expect(themed.has(colour), colour).toBe(true);
  });

  it("leaves the context as it found it", () => {
    const ctx = draw((pen) => drawTile(pen, 0, 0, 40, 2, THEME));
    expect(ctx.depth).toBe(0);
  });
});

describe("a piece", () => {
  it("lays one tile per cell from its top left corner", () => {
    const piece = pieceOf("ell-right");
    const box = bounds(painted(draw((ctx) => drawPiece(ctx, piece, 10, 20, 30, THEME))));
    expect(box).toEqual({ left: 11, top: 21, right: 10 + 3 * 30 - 1, bottom: 20 + 2 * 30 - 1 });
  });

  it("is centred on a point when asked", () => {
    const box = bounds(painted(draw((ctx) => drawPieceCentred(ctx, pieceOf("square"), 100, 100, 20, THEME))));
    expect([box.left + box.right, box.top + box.bottom]).toEqual([200, 200]);
  });

  it("floats when lifted, with its shadow under it", () => {
    const ctx = draw((pen) => drawLifted(pen, pieceOf("domino-h"), 100, 100, 40, THEME, 0));
    const alphas = ctx.calls.filter((call) => call.name === "globalAlpha").map((call) => call.value);
    expect(alphas.some((alpha) => alpha > 0 && alpha < 0.5)).toBe(true);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(100 - 40 - 1);
    expect(box.right).toBeLessThanOrEqual(100 + 40 + 6);
    expect(ctx.depth).toBe(0);
  });
});
