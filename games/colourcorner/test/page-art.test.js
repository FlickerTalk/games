import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { required } from "../src/geometry.js";
import { drawPage, drawPattern, drawStamp } from "../src/page-art.js";
import { pageOf } from "../src/pages.js";
import { PAINT_KEYS, THEME, themeFor } from "../src/theme.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";

const cat = pageOf("cat");
const where = { x: 20, y: 30, w: 240, h: 288, scale: 0.8 };
const page = (options = {}, theme = THEME) => draw((ctx) => drawPage(ctx, cat, where, theme, options));
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;

describe("a colouring page", () => {
  it("draws every zone with its outline, inside the box it is given", () => {
    const ctx = page();
    expect(ctx.calls.filter((call) => call.op === "stroke").length).toBeGreaterThanOrEqual(cat.regions.length);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(where.x - 4);
    expect(box.top).toBeGreaterThanOrEqual(where.y - 4);
    expect(box.right).toBeLessThanOrEqual(where.x + where.w + 4);
    expect(box.bottom).toBeLessThanOrEqual(where.y + where.h + 4);
    expect(ctx.depth).toBe(0);
  });

  it("paints a zone in the paint it was given, and leaves the others as paper", () => {
    const plain = colours(page());
    const coloured = colours(page({ fills: { 0: String(PAINT_KEYS.indexOf("purple")) } }));
    expect(plain).not.toContain(THEME.art.paints[PAINT_KEYS.indexOf("purple")]);
    expect(coloured).toContain(THEME.art.paints[PAINT_KEYS.indexOf("purple")]);
    expect(plain).toContain(THEME.art.paper);
  });

  it("shows a small dot of the suggested colour in each blank zone a finger can fill, and none in a painted one", () => {
    const asked = required(cat);
    expect(arcs(page({ dots: true })) - arcs(page({ dots: false }))).toBe(asked.length);
    expect(arcs(page({ dots: true, fills: { [asked[0]]: "3" } })) - arcs(page({ dots: false, fills: { [asked[0]]: "3" } }))).toBe(asked.length - 1);
  });

  it("lets paint spread from the finger, nothing of it at first and all of the zone at the end", () => {
    const zone = required(cat)[0];
    const purple = THEME.art.paints[8];
    const start = page({ fills: { [zone]: "8" }, spreads: [{ zone, x: 150, y: 200, progress: 0 }] });
    const middle = page({ fills: { [zone]: "8" }, spreads: [{ zone, x: 150, y: 200, progress: 0.5 }] });
    expect(colours(start)).not.toContain(purple);
    expect(colours(middle)).toContain(purple);
    expect(middle.calls.some((call) => call.op === "clip")).toBe(true);
  });

  it("fills a zone with a pattern made of many small shapes", () => {
    for (const token of ["d3", "s1", "t7", "r", "g"]) expect(shapes(page({ fills: { 0: token } })).length, token).toBeGreaterThan(shapes(page({ fills: { 0: "3" } })).length + 10);
  });

  it("draws brush lines and stamps over the zones, mirrored ones twice", () => {
    const line = { k: "l", p: 1, w: 2, m: 0, pts: [10, 10, 100, 100] };
    const plain = page().calls.filter((call) => call.op === "stroke").length;
    expect(page({ items: [line] }).calls.filter((call) => call.op === "stroke").length).toBe(plain + 1);
    expect(page({ items: [{ ...line, m: 1 }] }).calls.filter((call) => call.op === "stroke").length).toBe(plain + 2);
    expect(page({ items: [{ ...line, w: 2 }] }).calls.some((call) => call.op === "set" && call.name === "lineWidth" && call.value === 30)).toBe(true);
    expect(shapes(page({ items: [{ k: "s", t: 3, p: 2, x: 50, y: 50, m: 1 }] })).length).toBeGreaterThan(shapes(page()).length + 4);
  });

  it("puts a light rim around the ink on a dark page only", () => {
    const dark = themeFor(tokensFor("mono-dark"));
    expect(colours(page({}, dark))).toContain(dark.art.rim);
    expect(colours(page({}, themeFor(tokensFor("mono-light"))))).not.toContain(dark.art.rim);
  });
});

describe("the patterns and the stamps", () => {
  it("keep inside the area they are given", () => {
    for (const pattern of ["dots", "stripes", "stars", "rainbow", "glitter"]) {
      const ctx = draw((pen) => drawPattern(pen, pattern, 3, [100, 100, 160, 140], THEME));
      expect(ctx.calls.some((call) => call.op === "fill"), pattern).toBe(true);
      const box = bounds(painted(ctx));
      expect(box.left, pattern).toBeGreaterThanOrEqual(100 - 64);
      expect(box.right, pattern).toBeLessThanOrEqual(160 + 64);
    }
  });

  it("draws each of the six stamps at the size asked", () => {
    for (const kind of ["star", "heart", "flower", "leaf", "paw", "car"]) {
      const box = bounds(painted(draw((ctx) => drawStamp(ctx, kind, 100, 100, 40, THEME.art.paints[0], THEME))));
      expect(box.right - box.left, kind).toBeGreaterThan(20);
      expect(box.right - box.left, kind).toBeLessThanOrEqual(48);
    }
  });
});
