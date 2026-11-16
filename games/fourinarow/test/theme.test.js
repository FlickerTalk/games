import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of Four in a Row", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved wooden frame, and the two sides' discs apart by colour as well as their mark", () => {
    expect(ART.board).toEqual({ wood: "#D89A54", rail: "#F2C979", edge: "#A9603C", hole: "#FFF3D2" });
    expect(ART.pieces.map((piece) => piece.mark)).toEqual(["cross", "ring"]);
    expect(contrastOf(ART.pieces[0].body, ART.pieces[1].body)).toBeGreaterThan(1.8);
  });

  it("sits in every app theme: the frame at dusk on a dark page, the discs in their full colour, the holes still told apart from the wood", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.pieces, name).toEqual(ART.pieces);
      const top = Math.max(...Object.values(theme.board).map((colour) => oklchOf(colour).l));
      if (dark) expect(top, name).toBeLessThan(0.8);
      else expect(theme.board, name).toEqual(ART.board);
      expect(contrastOf(theme.board.hole, theme.board.wood), name).toBeGreaterThan(2);
      expect(Boolean(theme.rim), name).toBe(dark);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
