import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of dots and boxes", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved notebook page, and the two sides apart by their mark as well as their colour", () => {
    expect(ART.board).toMatchObject({ paper: "#FFFDF4", rule: "#A8D4E4", margin: "#F29A91", track: "#CBD5D5", open: "#718092" });
    expect(ART.pieces.map((piece) => piece.mark)).toEqual(["cross", "ring"]);
    expect(ART.pieces.map((piece) => piece.body)).toEqual(["#FFCF3F", "#8D7DE8"]);
    expect(contrastOf(ART.pieces[0].body, ART.pieces[1].body)).toBeGreaterThan(1.8);
    expect([ART.board.tile0, ART.board.tile1]).toEqual(["#FFE584", "#B8ACF5"]);
  });

  it("sits in every app theme: the page at dusk on a dark one with its claimed boxes, the marks in their full colour, the open lines still seen", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.pieces, name).toEqual(ART.pieces);
      const top = Math.max(...Object.values(theme.board).map((colour) => oklchOf(colour).l));
      if (dark) expect(top, name).toBeLessThan(0.8);
      else expect(theme.board, name).toEqual(ART.board);
      expect(contrastOf(theme.board.open, theme.board.paper), name).toBeGreaterThan(2);
      expect(contrastOf(theme.ink, theme.board.paper), name).toBeGreaterThan(3);
      expect(Boolean(theme.rim), name).toBe(dark);
    }
  });

  it("colours a claimed box as the page tinted with its side's colour, light or dark, so a box of the cross stays golden at dusk", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const page = oklchOf(theme.board.paper).l;
      theme.pieces.forEach(({ body }, side) => {
        const tile = oklchOf(theme.board[`tile${side}`]);
        const [low, high] = [page, oklchOf(body).l].sort((a, b) => a - b);
        expect(tile.l, `${name} side ${side}`).toBeGreaterThanOrEqual(low - 0.005);
        expect(tile.l, `${name} side ${side}`).toBeLessThanOrEqual(high + 0.005);
        expect(Math.abs(tile.h - oklchOf(body).h), `${name} side ${side}`).toBeLessThan(15);
      });
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
