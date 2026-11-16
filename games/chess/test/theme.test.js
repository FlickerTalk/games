import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of chess", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved classic wooden board and the ivory and slate pieces", () => {
    expect(ART.board).toMatchObject({ light: "#D7B584", dark: "#8B6247", frame: "#5C4032", grain: "#A77B58" });
    expect(ART.pieces[0]).toMatchObject({ fill: "#F4EBD8", shade: "#CBBBA1" });
    expect(ART.pieces[1]).toMatchObject({ fill: "#39434E", shade: "#242D36" });
    expect(oklchOf(ART.pieces[0].fill).l - oklchOf(ART.pieces[1].fill).l).toBeGreaterThan(0.4);
  });

  it("outlines the side to move in a warm tone for white and a cool one for black, both readable on a light page and a dark one", () => {
    const [white, black] = ART.sides;
    expect(white).not.toBe(black);
    for (const page of ["#ffffff", "#000000"]) {
      expect(contrastOf(white, page), page).toBeGreaterThan(1.9);
      expect(contrastOf(black, page), page).toBeGreaterThan(1.9);
    }
  });

  it("sits in every app theme: the board at dusk on a dark page, the pieces in their full colour, the squares still told apart", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.pieces, name).toEqual(ART.pieces);
      const top = Math.max(...Object.values(theme.board).map((colour) => oklchOf(colour).l));
      if (dark) expect(top, name).toBeLessThan(0.8);
      else expect(theme.board, name).toEqual(ART.board);
      expect(contrastOf(theme.board.light, theme.board.dark), name).toBeGreaterThan(2);
      expect(Boolean(theme.rim), name).toBe(dark);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
