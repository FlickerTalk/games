import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawPiece, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const KINDS = ["k", "q", "r", "b", "n", "p"];
const piece = (token, options) => draw((ctx) => drawPiece(ctx, theme, token, 100, 100, 40, options));
const polygons = (ctx, corners) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === corners) found += 1;
      run = 0;
    } else if (call.op !== "set") run = 0;
  }
  return found;
};

describe("a chess piece", () => {
  it("draws the six kinds of both colours, each its own shape, inside the size it is given", () => {
    const seen = new Set();
    for (const kind of KINDS) {
      for (const token of [kind.toUpperCase(), kind]) {
        const ctx = piece(token);
        const area = bounds(painted(ctx));
        expect(area.left, token).toBeGreaterThanOrEqual(100 - 20);
        expect(area.right, token).toBeLessThanOrEqual(100 + 20);
        expect(area.top, token).toBeGreaterThanOrEqual(100 - 20);
        expect(area.bottom, token).toBeLessThanOrEqual(100 + 20);
        expect(ctx.depth, token).toBe(0);
        seen.add(shapes(ctx).join("\n"));
      }
    }
    expect(seen.size).toBe(12);
  });

  it("stands the king tallest, its cross above every other piece", () => {
    const top = (token) => bounds(painted(piece(token))).top;
    for (const kind of ["q", "r", "b", "n", "p"]) expect(top("K"), kind).toBeLessThan(top(kind.toUpperCase()));
  });

  it("tells the two colours apart by the shape of the base, not by colour alone: round for white, clipped for black", () => {
    for (const kind of KINDS) {
      expect(polygons(piece(kind.toUpperCase()), 6), kind).toBe(0);
      expect(polygons(piece(kind), 6), kind).toBe(1);
    }
  });

  it("is drawn in the approved ivory or slate, outlined in ink", () => {
    expect(colours(piece("Q"))).toContain(theme.pieces[0].fill);
    expect(colours(piece("q"))).toContain(theme.pieces[1].fill);
    expect(colours(piece("q"))).toContain(theme.ink);
  });

  it("shows faded while its move waits for the other phone, and takes a light rim around its ink when asked", () => {
    const alphas = piece("P", { alpha: 0.5 }).calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    expect(alphas).toContain(0.5);
    expect(colours(piece("p", { rim: "#888888" }))).toContain("#888888");
    expect(colours(piece("p"))).not.toContain("#888888");
  });

  it("draws nothing for something that is not a piece", () => {
    expect(piece("x").calls).toHaveLength(0);
    expect(piece(null).calls).toHaveLength(0);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's king, hidden from screen readers, the black one on its clipped base", () => {
    const [white, black] = [sideMark(0), sideMark(1)];
    expect(white).not.toBe(black);
    for (const mark of [white, black]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    const hexagon = /<polygon points="(?:-?[\d.]+,-?[\d.]+ ){5}-?[\d.]+,-?[\d.]+"/;
    expect(black).toMatch(hexagon);
    expect(white).not.toMatch(hexagon);
    expect(white).toContain(theme.pieces[0].fill);
    expect(black).toContain(theme.pieces[1].fill);
  });
});
