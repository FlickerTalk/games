import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;
const lightness = (colour) => oklchOf(colour).l;

describe("the look of crazy eights", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the printed deck's own colours, and tells the two sides apart by shape as well as colour", () => {
    expect(ART.deck).toMatchObject({ paper: "#FFFFFF", red: "#FF0000", black: "#000000", blue: "#4444FF", gold: "#FFCC44" });
    expect(ART.sides[0].mark).not.toBe(ART.sides[1].mark);
    expect(oklchOf(ART.table.felt).h).toBeGreaterThan(120);
    expect(oklchOf(ART.table.felt).h).toBeLessThan(180);
  });

  it("sits in every app theme: the cloth and the cards' paper lowered under the bright line on a dark page, the suits in their full colour", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const dark = name.endsWith("-dark");
      const theme = themeFor(tokensFor(name), { dark });
      expect(theme.dark, name).toBe(dark);
      expect([theme.deck.red, theme.deck.black, theme.deck.blue], name).toEqual([ART.deck.red, ART.deck.black, ART.deck.blue]);
      if (dark) {
        for (const colour of [theme.deck.paper, theme.deck.gold, theme.back.border, theme.marks.chip]) expect(lightness(colour), name).toBeLessThan(0.8);
        expect(Math.max(...Object.values(theme.table).map(lightness)), name).toBeLessThan(0.8);
      } else {
        expect(theme.deck, name).toEqual(ART.deck);
        expect(theme.table, name).toEqual(ART.table);
      }
      expect(contrastOf(theme.deck.paper, theme.table.felt), name).toBeGreaterThan(3);
      expect(contrastOf(theme.deck.paper, theme.deck.red), name).toBeGreaterThan(1.9);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
