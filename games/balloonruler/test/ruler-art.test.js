import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawAim, drawGhost, drawGuessMarker, drawRipple, drawRuler, drawThread, drawTruePlace } from "../src/ruler-art.js";
import { THEME } from "../src/theme.js";

const { art } = THEME;
const RULER = Object.freeze({ x: 20, y: 500, w: 344, h: 68 });
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const fonts = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));
const strokes = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;

describe("the ruler", () => {
  it("is a wooden ruler inside its box with only its two ends numbered, in digits of 20 px or more", () => {
    for (const range of [10, 20, 100, 1, 1000]) {
      const ctx = draw((pen) => drawRuler(pen, RULER, { range }, THEME));
      expect(texts(ctx), `${range}`).toEqual(["0", String(range === 1000 ? "1,000" : range)]);
      for (const size of fonts(ctx)) expect(size).toBeGreaterThanOrEqual(20);
      expect(colours(ctx)).toContain(art.ruler.wood);
      const box = bounds(painted(ctx));
      expect(box.left).toBeGreaterThanOrEqual(RULER.x - 0.5);
      expect(box.right).toBeLessThanOrEqual(RULER.x + RULER.w + 0.5);
      expect(box.top).toBeGreaterThanOrEqual(RULER.y - 0.5);
      expect(box.bottom).toBeLessThanOrEqual(RULER.y + RULER.h + 0.5);
      expect(ctx.depth).toBe(0);
    }
  });

  it("shows only the ends and the middle until it is asked for more marks", () => {
    const plain = draw((pen) => drawRuler(pen, RULER, { range: 10 }, THEME));
    const marked = draw((pen) => drawRuler(pen, RULER, { range: 10, ticks: true }, THEME));
    expect(strokes(marked) - strokes(plain)).toBe(8);
  });

  it("writes the far end in the language's own digits", () => {
    expect(texts(draw((pen) => drawRuler(pen, RULER, { range: 1000, lang: "de" }, THEME)))).toEqual(["0", "1.000"]);
  });
});

describe("what a guess leaves on the ruler", () => {
  it("marks the player's guess with a circle and the rival's with a diamond", () => {
    const mine = draw((pen) => drawGuessMarker(pen, 100, 580, 20, "mine", THEME));
    const rival = draw((pen) => drawGuessMarker(pen, 100, 580, 20, "rival", THEME));
    expect(mine.calls.some((call) => call.op === "arc")).toBe(true);
    expect(rival.calls.some((call) => call.op === "arc")).toBe(false);
    expect(colours(mine)).toContain(art.marker.mine);
    expect(colours(rival)).toContain(art.marker.rival);
  });

  it("lights the true place with a star that swells once", () => {
    const wide = (progress) => {
      const box = bounds(painted(draw((pen) => drawTruePlace(pen, 100, 500, 30, progress, THEME))));
      return box.right - box.left;
    };
    expect(wide(0.5)).toBeGreaterThan(wide(0));
    expect(wide(1)).toBeCloseTo(wide(0), 5);
  });

  it("stretches a thread from the guess to the true place, coloured by how close it was", () => {
    for (const [stars, colour] of [[3, art.thread.short], [2, art.thread.medium], [1, art.thread.long]]) {
      const ctx = draw((pen) => drawThread(pen, 100, 220, 590, { stars, progress: 1 }, THEME));
      expect(colours(ctx)).toContain(colour);
      const box = bounds(painted(ctx));
      expect(box.left).toBeGreaterThanOrEqual(99);
      expect(box.right).toBeLessThanOrEqual(221);
      expect(ctx.depth).toBe(0);
    }
    const half = bounds(painted(draw((pen) => drawThread(pen, 100, 220, 590, { stars: 1, progress: 0.5 }, THEME))));
    expect(half.right).toBeLessThanOrEqual(161);
  });

  it("answers a touch with a ripple that fades, a guide while the finger aims, and the friend's guess as a pale diamond", () => {
    expect(draw((pen) => drawRipple(pen, 50, 50, 40, 0, THEME)).calls).toEqual([]);
    expect(draw((pen) => drawRipple(pen, 50, 50, 40, 0.5, THEME)).calls.length).toBeGreaterThan(0);
    const aim = draw((pen) => drawAim(pen, 120, 200, 500, THEME));
    expect(bounds(painted(aim))).toMatchObject({ left: 120, right: 120, top: 200, bottom: 500 });
    expect(colours(draw((pen) => drawGhost(pen, 80, 480, 24, THEME)))).toContain(art.marker.ghost);
  });
});
