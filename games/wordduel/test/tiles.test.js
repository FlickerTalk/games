import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawTile, tileDepth } from "../src/tiles.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const tile = (options) => draw((ctx) => drawTile(ctx, theme, 100, 100, 40, options));
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const shapesOf = (ctx) => {
  const found = [];
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run) found.push(run);
      run = 0;
    } else if (call.op === "stroke" && run === 2) {
      found.push("dash");
      run = 0;
    }
  }
  return found;
};
const widthOf = (ctx) => {
  const area = bounds(painted(ctx));
  return area.right - area.left;
};

describe("a letter tile", () => {
  it("is a wooden block with its letter in capitals, and a bare block with none", () => {
    const block = tile({ letter: "ñ" });
    expect(texts(block)).toEqual(["Ñ"]);
    expect(colours(block)).toEqual(expect.arrayContaining([theme.board.face, theme.board.base]));
    expect(texts(tile({}))).toEqual([]);
  });

  it("tells the three answers apart by a sign of its own, not by colour alone", () => {
    const signs = Object.fromEntries(["g", "y", "b"].map((mark) => [mark, shapesOf(tile({ letter: "a", mark }))]));
    expect(signs.g).toContain(10);
    expect(signs.y).toContain(4);
    expect(signs.y).not.toContain(10);
    expect(signs.b.filter((one) => one === "dash").length).toBeGreaterThanOrEqual(4);
    expect(signs.b).not.toContain(10);
    expect(signs.b).not.toContain(4);
    for (const mark of ["g", "y", "b"]) expect(colours(tile({ letter: "a", mark }))).toContain(theme.tiles[mark].face);
    expect(colours(tile({ letter: "a" }))).not.toContain(theme.tiles.g.face);
  });

  it("writes the letter in the colour that reads on its face", () => {
    const fills = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle").map((call) => call.value);
    const letterColour = (options) => {
      const ctx = tile({ letter: "a", ...options });
      const at = ctx.calls.findIndex((call) => call.op === "fillText");
      return fills({ calls: ctx.calls.slice(0, at) }).at(-1);
    };
    expect(letterColour({})).toBe(theme.ink);
    for (const mark of ["g", "y", "b"]) expect(letterColour({ mark })).toBe(theme.tiles[mark].letter);
  });

  it("turns over on its flip, the answer showing only once it is past halfway", () => {
    expect(colours(tile({ letter: "a", mark: "g", flip: 0.3 }))).not.toContain(theme.tiles.g.face);
    expect(colours(tile({ letter: "a", mark: "g", flip: 0.7 }))).toContain(theme.tiles.g.face);
    expect(widthOf(tile({ letter: "a", mark: "g", flip: 0.5 }))).toBeLessThan(widthOf(tile({ letter: "a", mark: "g", flip: 1 })) * 0.2);
    expect(widthOf(tile({ letter: "a", mark: "g", flip: 0 }))).toBeCloseTo(widthOf(tile({ letter: "a", mark: "g", flip: 1 })), 0);
  });

  it("stays inside its box and the depth under it", () => {
    for (const options of [{}, { letter: "w", mark: "y" }, { letter: "m", typing: true }]) {
      const area = bounds(painted(tile(options)));
      expect(area.left).toBeGreaterThanOrEqual(100 - 40 * 0.1);
      expect(area.right).toBeLessThanOrEqual(140 + 40 * 0.1);
      expect(area.top).toBeGreaterThanOrEqual(100 - 40 * 0.1);
      expect(area.bottom).toBeLessThanOrEqual(140 + tileDepth(40) + 40 * 0.1);
    }
  });

  it("is outlined in the app's accent while it is being typed, and faded while its guess is on its way", () => {
    const strokes = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(tile({ letter: "a", typing: true }))).toContain(theme.ui.accent);
    expect(strokes(tile({ letter: "a" }))).not.toContain(theme.ui.accent);
    const faded = tile({ letter: "a", alpha: 0.5 });
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.5);
    expect(faded.depth).toBe(0);
  });
});
