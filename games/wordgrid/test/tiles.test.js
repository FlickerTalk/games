import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawTile, sideMark } from "../src/tiles.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const tile = (letter, options) => draw((ctx) => drawTile(ctx, theme, 100, 100, 40, letter, options));
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;
const area = (ctx) => bounds(painted(ctx));

describe("a letter tile", () => {
  it("is a wooden block with its letter in capitals, inside its cell", () => {
    const ctx = tile("ñ");
    expect(texts(ctx)).toEqual(["Ñ"]);
    expect(colours(ctx)).toEqual(expect.arrayContaining([theme.board.face, theme.board.edge, theme.ink]));
    const { left, right, top, bottom } = area(ctx);
    expect(left).toBeGreaterThanOrEqual(80);
    expect(right).toBeLessThanOrEqual(120);
    expect(top).toBeGreaterThanOrEqual(80);
    expect(bottom).toBeLessThanOrEqual(120);
    expect(ctx.depth).toBe(0);
  });

  it("takes the colour of the side tracing a word, with its place in the word, and keeps its letter", () => {
    const traced = tile("a", { side: 1, order: 3 });
    expect(colours(traced)).toContain(theme.sides[1].body);
    expect(colours(traced)).not.toContain(theme.sides[0].body);
    expect(texts(traced)).toEqual(["A", "3"]);
    expect(colours(tile("a"))).not.toContain(theme.sides[1].body);
  });

  it("carries three small dots when it may come next, and a small star when it is in the last word said", () => {
    expect(arcs(tile("a", { can: true })) - arcs(tile("a"))).toBe(3);
    const last = tile("a", { last: true });
    expect(colours(last)).toContain(theme.marks.star);
    expect(colours(tile("a"))).not.toContain(theme.marks.star);
  });

  it("rises as it hops and moves sideways as it shakes, back on its cell at either end", () => {
    expect(area(tile("a", { hop: 0.5 })).top).toBeLessThan(area(tile("a")).top - 5);
    expect(area(tile("a", { hop: 1 })).top).toBeCloseTo(area(tile("a")).top, 6);
    expect(area(tile("a", { shake: 0.08 })).left).not.toBeCloseTo(area(tile("a")).left, 1);
    expect(area(tile("a", { shake: 1 })).left).toBeCloseTo(area(tile("a")).left, 6);
  });

  it("is a plain block with no letter while the letters are being drawn, and faded while a word waits for the other phone", () => {
    expect(texts(tile(""))).toEqual([]);
    const faded = tile("a", { alpha: 0.5 });
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.5);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is the side's shape in its colour, a star in a disc or a diamond with three dots, hidden from screen readers", () => {
    const [first, second] = [sideMark(0), sideMark(1)];
    for (const mark of [first, second]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(first).toContain(theme.sides[0].body);
    expect(second).toContain(theme.sides[1].body);
    expect(first).toMatch(/<circle[^>]*\/><polygon/);
    expect(second.match(/<circle/g)).toHaveLength(3);
  });
});
