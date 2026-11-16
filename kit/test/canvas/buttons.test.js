import { describe, expect, it } from "vitest";
import { GLYPHS, drawGlyph, drawMark, drawRoundButton, glyphSize } from "../../src/canvas/buttons.js";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { bounds, colours, draw, painted, shapes } from "./recorder.js";
import { tokensFor } from "./themes.js";

const UI = themeFromTokens(tokensFor("ember-dark"));
const fills = (ctx) => ctx.calls.filter((call) => call.op === "fill").length;
const glyphBox = (glyph, size, options) => bounds(painted(draw((ctx) => drawGlyph(ctx, glyph, 0, 0, size, "ink", { ...options, line: 2 }))));

describe("the outline icons", () => {
  it("draw each glyph its own way", () => {
    for (const glyph of ["pause", "play", "speaker", "music", "again", "home", "check", "close", "call", "looks"]) expect(GLYPHS).toContain(glyph);
    const drawn = GLYPHS.map((glyph) => shapes(draw((ctx) => drawGlyph(ctx, glyph, 50, 50, 40, "ink", { line: 2 }))).join("\n"));
    expect(new Set(drawn).size).toBe(GLYPHS.length);
  });

  it("are thin outlines with round ends, never filled", () => {
    for (const glyph of GLYPHS) {
      const ctx = draw((pen) => drawGlyph(pen, glyph, 0, 0, 24, "ink", { line: 2 }));
      expect(fills(ctx), glyph).toBe(0);
      expect(ctx.calls.some((call) => call.op === "stroke"), glyph).toBe(true);
      const widths = ctx.calls.filter((call) => call.name === "lineWidth").map((call) => call.value);
      expect(Math.min(...widths), glyph).toBeGreaterThanOrEqual(2);
      expect(Math.max(...widths), glyph).toBeLessThanOrEqual(5);
      expect(ctx.calls.filter((call) => call.name === "lineCap").every((call) => call.value === "round"), glyph).toBe(true);
      expect(ctx.depth).toBe(0);
    }
  });

  it("are never smaller than 24 px, and fill most of their box", () => {
    for (const diameter of [36, 44, 88, 120]) expect(glyphSize(diameter), String(diameter)).toBeGreaterThanOrEqual(24);
    for (const glyph of GLYPHS) {
      const box = glyphBox(glyph, 24);
      expect(Math.max(box.right - box.left, box.bottom - box.top), glyph).toBeGreaterThanOrEqual(14);
      expect(Math.max(Math.abs(box.left), Math.abs(box.right), Math.abs(box.top), Math.abs(box.bottom)), glyph).toBeLessThanOrEqual(13);
    }
  });

  it("cross the speaker out at zero, with one wave when low and two when high, and strike the music through when it is off", () => {
    const count = (level) => draw((ctx) => drawGlyph(ctx, "speaker", 0, 0, 40, "ink", { level, line: 2 })).calls.filter((call) => call.op === "arc").length;
    expect(count("high")).toBe(2);
    expect(count("low")).toBe(1);
    expect(count("mute")).toBe(0);
    const lines = (options) => draw((ctx) => drawGlyph(ctx, "music", 0, 0, 40, "ink", { ...options, line: 2 })).calls.filter((call) => call.op === "lineTo").length;
    expect(lines({ off: true })).toBeGreaterThan(lines({ off: false }));
  });

  it("take a game's own drawing in place of a name", () => {
    const ctx = draw((pen) => drawGlyph(pen, (c, size, colour) => {
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(size, 0);
      c.strokeStyle = colour;
      c.stroke();
    }, 10, 10, 24, "ink"));
    expect(ctx.calls.find((call) => call.op === "lineTo").points[0]).toEqual([34, 10]);
  });
});

describe("the round buttons", () => {
  it("are flat discs inside their size, with no shadow", () => {
    for (const glyph of GLYPHS) {
      const ctx = draw((pen) => drawRoundButton(pen, glyph, 100, 100, 56, UI));
      const box = bounds(painted(ctx));
      expect(box.left, glyph).toBeGreaterThanOrEqual(72);
      expect(box.right, glyph).toBeLessThanOrEqual(128);
      expect(box.top, glyph).toBeGreaterThanOrEqual(72);
      expect(box.bottom, glyph).toBeLessThanOrEqual(128);
      expect(fills(ctx), glyph).toBe(1);
      expect(ctx.depth).toBe(0);
    }
  });

  it("are a surface with a border and the text's icon, or the accent with its own icon when they are the main action", () => {
    const plain = colours(draw((ctx) => drawRoundButton(ctx, "pause", 0, 0, 56, UI)));
    expect(plain).toEqual(expect.arrayContaining([UI.surface, UI.border, UI.text]));
    const main = colours(draw((ctx) => drawRoundButton(ctx, "play", 0, 0, 120, UI, { primary: true })));
    expect(main).toEqual(expect.arrayContaining([UI.accent, UI.onAccent]));
    expect(main).not.toContain(UI.surface);
  });

  it("look pressed the moment they are pressed, and every colour comes from the palette", () => {
    const palette = new Set(Object.values(UI).filter((value) => typeof value === "string"));
    for (const primary of [false, true]) {
      const up = colours(draw((ctx) => drawRoundButton(ctx, "again", 0, 0, 120, UI, { primary })));
      const down = colours(draw((ctx) => drawRoundButton(ctx, "again", 0, 0, 120, UI, { primary, pressed: true })));
      expect(down).not.toEqual(up);
      expect(down).toContain(UI.pressed);
      for (const colour of [...up, ...down]) expect(palette.has(colour), colour).toBe(true);
    }
  });

  it("mark a choice with a small accent badge and its check", () => {
    const ctx = draw((pen) => drawMark(pen, "check", 50, 50, 36, UI));
    expect(colours(ctx)).toEqual(expect.arrayContaining([UI.accent, UI.onAccent]));
    const box = bounds(painted(ctx));
    expect(box.right - box.left).toBeLessThanOrEqual(36);
    expect(ctx.depth).toBe(0);
  });
});
