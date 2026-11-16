import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawNumberCard, drawRulerPicture } from "../src/card-art.js";
import { THEME } from "../src/theme.js";

const { art, ui } = THEME;
const CARD = Object.freeze({ x: 126, y: 118, w: 132, h: 116 });
const SMALL = Object.freeze({ x: 12, y: 66, w: 79, h: 69 });
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const fonts = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;

describe("the number card", () => {
  it("is a panel in the app's colours, inside its box", () => {
    for (const card of [{ kind: "dots", value: 9 }, { kind: "digit", value: 990 }, { kind: "fraction", parts: 5, filled: 2 }]) {
      for (const area of [CARD, SMALL]) {
        const ctx = draw((pen) => drawNumberCard(pen, area, card, THEME));
        expect(colours(ctx)).toContain(ui.surface);
        const box = bounds(painted(ctx));
        expect(box.left).toBeGreaterThanOrEqual(area.x);
        expect(box.right).toBeLessThanOrEqual(area.x + area.w);
        expect(box.top).toBeGreaterThanOrEqual(area.y);
        expect(box.bottom).toBeLessThanOrEqual(area.y + area.h);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("shows a small number as that many dots, with no digit", () => {
    for (const value of [1, 4, 9]) {
      const ctx = draw((pen) => drawNumberCard(pen, CARD, { kind: "dots", value }, THEME));
      expect(arcs(ctx)).toBe(value);
      expect(texts(ctx)).toEqual([]);
      expect(colours(ctx)).toContain(art.card.dot);
    }
  });

  it("shows a digit large, in the app's text colour and the language's digits, never under 20 px", () => {
    const ctx = draw((pen) => drawNumberCard(pen, CARD, { kind: "digit", value: 7 }, THEME));
    expect(texts(ctx)).toEqual(["7"]);
    expect(colours(ctx)).toContain(ui.text);
    expect(fonts(ctx)[0]).toBeGreaterThanOrEqual(40);
    const long = draw((pen) => drawNumberCard(pen, SMALL, { kind: "digit", value: 990 }, THEME));
    expect(fonts(long)[0]).toBeGreaterThanOrEqual(20);
    expect(texts(draw((pen) => drawNumberCard(pen, CARD, { kind: "digit", value: 7 }, THEME, { lang: "bn" })))).toEqual(["৭"]);
  });

  it("shows a fraction as a bar cut in equal parts, some of them filled", () => {
    const ctx = draw((pen) => drawNumberCard(pen, CARD, { kind: "fraction", parts: 4, filled: 3 }, THEME));
    expect(texts(ctx)).toEqual([]);
    expect(colours(ctx)).toContain(art.card.bar);
    const fills = ctx.calls.filter((call) => call.op === "fillRect");
    expect(fills).toHaveLength(1);
    const [[left], [right]] = fills[0].points;
    const whole = CARD.w * 0.76;
    expect(right - left).toBeCloseTo((whole * 3) / 4, 5);
  });
});

describe("the picture of a ruler to choose", () => {
  it("draws a short, a medium and a long ruler, longer and with more marks each time", () => {
    const area = { x: 10, y: 10, w: 88, h: 88 };
    const drawn = ["short", "medium", "long"].map((ruler) => draw((pen) => drawRulerPicture(pen, area, ruler, THEME)));
    const wide = drawn.map((ctx) => ctx.calls.filter((call) => call.op === "stroke").length);
    expect(wide[0]).toBeLessThan(wide[1]);
    expect(wide[1]).toBeLessThan(wide[2]);
    for (const ctx of drawn) {
      const box = bounds(painted(ctx));
      expect(box.left).toBeGreaterThanOrEqual(area.x);
      expect(box.right).toBeLessThanOrEqual(area.x + area.w);
      expect(texts(ctx)).toEqual([]);
    }
  });
});
