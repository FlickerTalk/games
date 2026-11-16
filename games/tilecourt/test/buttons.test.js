import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { GLYPHS, drawButton, drawGlyph } from "../src/buttons.js";
import { THEME } from "../src/theme.js";

const themed = new Set(JSON.stringify(THEME).match(/#[0-9A-F]{6}|rgba\([^)]*\)/g));

describe("the round buttons", () => {
  it("draw each glyph its own way", () => {
    const drawn = GLYPHS.map((glyph) => shapes(draw((ctx) => drawGlyph(ctx, glyph, 50, 50, 40, THEME.ui.icon, THEME))).join("\n"));
    expect(new Set(drawn).size).toBe(GLYPHS.length);
    for (const glyph of ["pause", "play", "speaker", "music", "again", "home", "check", "close", "gift", "call", "mosaic", "rotate", "hint"]) expect(GLYPHS).toContain(glyph);
  });

  it("keep the glyph and the button inside the button's circle and its shadow", () => {
    for (const glyph of GLYPHS) {
      const box = bounds(painted(draw((ctx) => drawButton(ctx, glyph, 100, 100, 56, THEME))));
      expect(box.left, glyph).toBeGreaterThanOrEqual(72);
      expect(box.right, glyph).toBeLessThanOrEqual(128);
      expect(box.top, glyph).toBeGreaterThanOrEqual(72);
      expect(box.bottom, glyph).toBeLessThanOrEqual(132);
    }
  });

  it("cross the speaker out when the sound is off, and strike the music through when it is off", () => {
    const loud = shapes(draw((ctx) => drawGlyph(ctx, "speaker", 0, 0, 40, THEME.ui.icon, THEME, { level: "high" }))).length;
    const low = shapes(draw((ctx) => drawGlyph(ctx, "speaker", 0, 0, 40, THEME.ui.icon, THEME, { level: "low" }))).length;
    const mute = draw((ctx) => drawGlyph(ctx, "speaker", 0, 0, 40, THEME.ui.icon, THEME, { level: "mute" }));
    expect(loud).toBeGreaterThan(low);
    expect(colours(mute)).toContain(THEME.ui.off);
    const on = colours(draw((ctx) => drawGlyph(ctx, "music", 0, 0, 40, THEME.ui.icon, THEME, { off: false })));
    const off = colours(draw((ctx) => drawGlyph(ctx, "music", 0, 0, 40, THEME.ui.icon, THEME, { off: true })));
    expect(on).not.toContain(THEME.ui.off);
    expect(off).toContain(THEME.ui.off);
  });

  it("take every colour from the theme, and look pressed when pressed", () => {
    const plain = draw((ctx) => drawButton(ctx, "again", 0, 0, 120, THEME));
    const pressed = draw((ctx) => drawButton(ctx, "again", 0, 0, 120, THEME, { pressed: true }));
    for (const colour of [...colours(plain), ...colours(pressed)]) expect(themed.has(colour), colour).toBe(true);
    expect(colours(pressed)).toContain(THEME.ui.pressed);
    expect(plain.depth).toBe(0);
  });
});
