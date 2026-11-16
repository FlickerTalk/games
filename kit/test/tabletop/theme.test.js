import { describe, expect, it } from "vitest";
import { oklchOf } from "../../src/canvas/tone.js";
import { duskBoard, tabletopTheme } from "../../src/tabletop/theme.js";
import { APP_THEMES, tokensFor } from "../canvas/themes.js";

const WOOD = { light: "#F0D39E", dark: "#AE774E", frame: "#79503B", grain: "#C99768" };
const PIECES = { lilac: "#8D7DE8", gold: "#FFCF3F" };
const lightness = (palette) => Object.values(palette).map((colour) => oklchOf(colour).l);

describe("the board at dusk", () => {
  it("stays as drawn on a light page", () => {
    expect(duskBoard(WOOD, { dark: false })).toEqual(WOOD);
  });

  it("is lowered as one on a dark page, its lightest colour under the bright line, every step between its colours kept", () => {
    const dusk = duskBoard(WOOD, { dark: true });
    const [before, after] = [lightness(WOOD), lightness(dusk)];
    expect(Math.max(...after)).toBeCloseTo(0.72, 2);
    const shift = before[0] - after[0];
    for (const [at, value] of after.entries()) expect(before[at] - value).toBeCloseTo(shift, 2);
    for (const key of Object.keys(WOOD)) expect(Math.abs(oklchOf(dusk[key]).h - oklchOf(WOOD[key]).h)).toBeLessThan(3);
  });

  it("leaves a board that is already deep enough alone", () => {
    const deep = { light: "#7A5236", dark: "#4A3020" };
    expect(duskBoard(deep, { dark: true })).toEqual(deep);
  });
});

describe("a board game's theme", () => {
  it("takes the interface from the app's colours, dims only the board on a dark page, rims it in a quiet grey there and keeps the pieces' full colour", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const dark = name.endsWith("-dark");
      const theme = tabletopTheme(tokensFor(name), { dark: !dark }, { board: WOOD, pieces: PIECES });
      expect(theme.dark, name).toBe(dark);
      expect(theme.ui.page, name).toBe(APP_THEMES[name]["--ion-background-color"].toUpperCase());
      expect(theme.rim, name).toBe(dark ? theme.ui.muted : null);
      expect(theme.pieces, name).toEqual(PIECES);
      expect(theme.board, name).toEqual(duskBoard(WOOD, { dark }));
      expect(Object.isFrozen(theme), name).toBe(true);
    }
  });

  it("follows the system's light or dark when the app gives no colours", () => {
    expect(tabletopTheme(null, { dark: true }, { board: WOOD }).dark).toBe(true);
    expect(tabletopTheme(null, { dark: false }, { board: WOOD }).board).toEqual(WOOD);
  });
});
