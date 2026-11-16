import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of Letter Grid", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => /\.(js|css)$/.test(name) && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved wooden blocks, and the two sides apart by colour as well as their mark", () => {
    expect(ART.board).toMatchObject({ frame: "#D99B62", face: "#F2C88F", inner: "#D99B62", edge: "#A96643" });
    expect(ART.ink).toBe("#243247");
    expect(ART.sides[0].mark).not.toBe(ART.sides[1].mark);
    expect(ART.sides.map((side) => side.body)).toEqual(["#FFCF3F", "#8D7DE8"]);
  });

  it("sits in every app theme: the blocks at dusk on a dark page, the sides in their full colour, the letters easy to read", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.sides, name).toEqual(ART.sides);
      const top = Math.max(...Object.values(theme.board).map((colour) => oklchOf(colour).l));
      if (dark) expect(top, name).toBeLessThan(0.8);
      else expect(theme.board, name).toEqual(ART.board);
      expect(contrastOf(theme.board.face, theme.ink), name).toBeGreaterThan(4.5);
      for (const side of theme.sides) expect(contrastOf(side.body, theme.ink), name).toBeGreaterThan(3);
      expect(contrastOf(theme.board.face, theme.board.edge), name).toBeGreaterThan(1.6);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
