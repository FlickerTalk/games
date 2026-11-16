import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of backgammon", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved classic wooden table, ivory against oxblood checkers told apart by their mark as well as their colour", () => {
    expect(ART.board).toMatchObject({ case: "#72513E", rail: "#967253", tray: "#4B352D", field: "#C4A984", pointA: "#E2CFAB", pointB: "#725043" });
    expect(ART.pieces[0].body).toBe("#E7DCC4");
    expect(ART.pieces[1].body).toBe("#754A45");
    expect(ART.pieces[0].mark).not.toBe(ART.pieces[1].mark);
    expect(oklchOf(ART.pieces[0].body).l).toBeGreaterThan(oklchOf(ART.pieces[1].body).l + 0.3);
  });

  it("draws real dice for each side, their pips standing out from the face", () => {
    for (const die of ART.dice) expect(contrastOf(die.face, die.pip)).toBeGreaterThan(3);
  });

  it("sits in every app theme: the table at dusk on a dark page, the checkers and dice in their full colour, the points still told apart", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.pieces, name).toEqual(ART.pieces);
      expect(theme.dice, name).toEqual(ART.dice);
      const top = Math.max(...Object.values(theme.board).map((colour) => oklchOf(colour).l));
      if (dark) expect(top, name).toBeLessThan(0.8);
      else expect(theme.board, name).toEqual(ART.board);
      expect(contrastOf(theme.board.pointA, theme.board.pointB), name).toBeGreaterThan(2);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
