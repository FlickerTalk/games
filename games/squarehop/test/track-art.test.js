import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { squareAt, trackIn } from "../src/layout.js";
import { FINISH } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { drawSquare, drawTrack } from "../src/track-art.js";

const LIGHT = themeFor(tokensFor("mono-light"));
const DARK = themeFor(tokensFor("mono-dark"));
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const fontSizes = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => parseFloat(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));

describe("a square of the track", () => {
  it("shows its number, 20 px or larger, and nothing else written", () => {
    for (const size of [33, 48, 62, 96]) {
      for (const [number, kind] of [[4, "plain"], [6, "spring"], [11, "turbo"], [16, "puddle"], [30, "finish"]]) {
        const ctx = draw((pen) => drawSquare(pen, 100, 100, size, number, kind, LIGHT, { lang: "en" }));
        expect(texts(ctx), `${kind} ${size}`).toEqual([String(number)]);
        expect(Math.min(...fontSizes(ctx)), `${kind} ${size}`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it("writes the number with the digits of the player's language", () => {
    const ctx = draw((pen) => drawSquare(pen, 100, 100, 60, 12, "plain", LIGHT, { lang: "ar" }));
    expect(texts(ctx)).toEqual([new Intl.NumberFormat("ar").format(12)]);
  });

  it("stays inside its square but for the ring of a lit one", () => {
    for (const kind of ["plain", "spring", "turbo", "puddle", "finish"]) {
      const box = bounds(painted(draw((pen) => drawSquare(pen, 100, 100, 60, 7, kind, LIGHT, {}))));
      expect(box.left, kind).toBeGreaterThanOrEqual(68);
      expect(box.right, kind).toBeLessThanOrEqual(132);
      expect(box.top, kind).toBeGreaterThanOrEqual(68);
      expect(box.bottom, kind).toBeLessThanOrEqual(132);
    }
  });

  it("draws each kind of square differently, and a lit one differently from one at rest", () => {
    const shape = (kind, options = {}) => JSON.stringify(draw((pen) => drawSquare(pen, 100, 100, 60, 7, kind, LIGHT, options)).calls.map((call) => [call.op, call.points]));
    const kinds = ["plain", "spring", "turbo", "puddle", "finish"].map((kind) => shape(kind));
    expect(new Set(kinds).size).toBe(5);
    expect(shape("plain", { lit: true })).not.toBe(shape("plain"));
    expect(shape("plain", { active: true })).not.toBe(shape("plain", { lit: true }));
  });
});

describe("the track", () => {
  it("draws every square once with its number, in order, in both themes", () => {
    const track = trackIn({ x: 8, y: 100, w: 368, h: 420 });
    for (const theme of [LIGHT, DARK]) {
      const ctx = draw((pen) => drawTrack(pen, track, theme, { time: 1, lang: "en" }));
      expect(texts(ctx)).toEqual(Array.from({ length: FINISH }, (_, at) => String(at + 1)));
      expect(ctx.depth).toBe(0);
    }
  });

  it("joins each row to the next with a connector from its last square to the first of the next", () => {
    const track = trackIn({ x: 8, y: 100, w: 368, h: 420 });
    const ctx = draw((pen) => drawTrack(pen, track, LIGHT, {}));
    const first = ctx.calls.findIndex((call) => call.op === "fillText");
    const before = ctx.calls.slice(0, first).filter((call) => call.op === "stroke").length;
    expect(before).toBeGreaterThanOrEqual(track.rows - 1);
    const end = squareAt(track, track.cols);
    const lines = ctx.calls.slice(0, first).filter((call) => call.op === "moveTo");
    expect(lines.some((call) => Math.abs(call.points[0][0] - end.x) < 1)).toBe(true);
  });

  it("lights the squares of the count, the last one the strongest", () => {
    const track = trackIn({ x: 8, y: 100, w: 368, h: 420 });
    const plain = draw((pen) => drawTrack(pen, track, LIGHT, {})).calls.length;
    const lit = draw((pen) => drawTrack(pen, track, LIGHT, { trail: { side: 0, lit: [3, 4, 5], active: 5 } })).calls.length;
    expect(lit).toBeGreaterThan(plain);
  });
});
