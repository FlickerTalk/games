import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of Word Duel", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => /\.(js|css)$/.test(name) && name !== "theme.js" && !name.startsWith("words-"))) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved wooden blocks and feedback colours, each answer told apart by its sign as well as its colour", () => {
    expect(ART.board).toEqual({ face: "#EBCB83", base: "#9B6747" });
    expect([ART.tiles.g.face, ART.tiles.y.face, ART.tiles.b.face]).toEqual(["#55B987", "#FFCF3F", "#7C899B"]);
    expect(new Set(["g", "y", "b"].map((mark) => ART.tiles[mark].sign)).size).toBe(3);
    expect(ART.sides.map((side) => side.mark)).toEqual(["star", "bars"]);
    expect(contrastOf(ART.sides[0].body, ART.sides[1].body)).toBeGreaterThan(1.8);
  });

  it("writes every letter where it can be read, on a bare block and on each answer", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      expect(contrastOf(theme.ink, theme.board.face), name).toBeGreaterThan(4.5);
      for (const mark of ["g", "y", "b"]) expect(contrastOf(theme.tiles[mark].letter, theme.tiles[mark].face), `${name} ${mark}`).toBeGreaterThanOrEqual(3.4);
    }
  });

  it("sits in every app theme: the bare blocks at dusk on a dark page, the answers in their full colour, the block's face still apart from its base", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.tiles, name).toEqual(ART.tiles);
      expect(theme.sides, name).toEqual(ART.sides);
      const top = Math.max(...Object.values(theme.board).map((colour) => oklchOf(colour).l));
      if (dark) expect(top, name).toBeLessThan(0.8);
      else expect(theme.board, name).toEqual(ART.board);
      expect(contrastOf(theme.board.face, theme.board.base), name).toBeGreaterThan(2.5);
      expect(theme.font).toMatch(/sans-serif/);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
