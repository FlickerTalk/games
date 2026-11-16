import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of Tic-Tac-Toe", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved slate with chalk lines, a chalk cross and a pale blue ring, each side with its own turn colour", () => {
    expect(ART.board).toEqual({ frame: "#415568", cell: "#334555" });
    expect(ART.grid).toEqual({ line: "#FFF6DB" });
    expect(ART.pieces.map((one) => one.body)).toEqual(["#FFF6DB", "#8FDEE7"]);
    expect(ART.pieces.map((one) => one.hue)).toEqual(["#FFCF3F", "#8D7DE8"]);
  });

  it("sits in every app theme: the slate as drawn, the chalk lines at dusk on a dark page, the pieces in their full colour", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.board, name).toEqual(ART.board);
      expect(theme.pieces, name).toEqual(ART.pieces);
      if (dark) expect(oklchOf(theme.grid.line).l, name).toBeLessThan(0.8);
      else expect(theme.grid, name).toEqual(ART.grid);
      expect(contrastOf(theme.grid.line, theme.board.cell), name).toBeGreaterThan(3);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
