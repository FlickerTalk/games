import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { DECK_ART } from "../../../kit/src/cards/colours.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, TABLE_OF, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;
const lightness = (colour) => oklchOf(colour).l;

describe("the look of Card Corner", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("sets each game on a sober table of its own: wood for Pairs, slate for War, green cloth for Rummy and Go Fish", () => {
    expect(TABLE_OF).toEqual({ choose: "cloth", pairs: "wood", war: "slate", rummy: "cloth", fish: "cloth" });
    expect(Object.keys(ART.tables)).toEqual(["cloth", "wood", "slate"]);
    expect(ART.sides[0].mark).not.toBe(ART.sides[1].mark);
  });

  it("sits in every app theme: tables and paper under the bright line on a dark page, the suits in their full colour, the cards clear on every table", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const dark = name.endsWith("-dark");
      const theme = themeFor(tokensFor(name), { dark });
      expect(theme.dark, name).toBe(dark);
      expect([theme.deck.red, theme.deck.black, theme.deck.blue], name).toEqual([DECK_ART.deck.red, DECK_ART.deck.black, DECK_ART.deck.blue]);
      for (const table of Object.values(theme.tables)) {
        if (dark) expect(Math.max(lightness(table.felt), lightness(table.line)), name).toBeLessThan(0.8);
        expect(contrastOf(theme.deck.paper, table.felt), name).toBeGreaterThan(3);
        expect(contrastOf(theme.marks.glow, table.felt), name).toBeGreaterThan(2.5);
      }
      if (dark) for (const colour of [theme.deck.paper, theme.back.border, theme.marks.glow, theme.marks.fish]) expect(lightness(colour), name).toBeLessThan(0.8);
      expect(theme.tables, name).toEqual(dark ? ART.dusk : ART.tables);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
