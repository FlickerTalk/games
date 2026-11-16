import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, oklchOf } from "../../../kit/src/canvas/tone.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { ART, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|\brgba?\(/i;

describe("the look of Sea Battle", () => {
  it("names its colours in one module only", () => {
    for (const file of readdirSync(SRC).filter((name) => name.endsWith(".js") && name !== "theme.js")) {
      expect(readFileSync(join(SRC, file), "utf8"), file).not.toMatch(COLOUR);
    }
  });

  it("keeps the approved toy sea, a yellow boat with a flag and a purple tug told apart by their mark", () => {
    expect(ART.board).toMatchObject({ water: "#55B9D1", line: "#9DE5ED", edge: "#C8E0E5" });
    expect(ART.boats.map((boat) => boat.body)).toEqual(["#FFCF3F", "#8D7DE8"]);
    expect(ART.boats[0].mark).not.toBe(ART.boats[1].mark);
    expect(ART.marks).toMatchObject({ paint: "#F26B5E", miss: "#D9F4F2" });
  });

  it("sits in every app theme: the sea at dusk on a dark page, the boats and the splashes in their full colour, the grid still seen", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const theme = themeFor(tokensFor(name), { dark: false });
      const dark = name.endsWith("-dark");
      expect(theme.dark, name).toBe(dark);
      expect(theme.boats, name).toEqual(ART.boats);
      expect(theme.marks, name).toEqual(ART.marks);
      const top = Math.max(...Object.values(theme.board).map((colour) => oklchOf(colour).l));
      if (dark) expect(top, name).toBeLessThan(0.8);
      else expect(theme.board, name).toEqual(ART.board);
      expect(contrastOf(theme.board.water, theme.board.line), name).toBeGreaterThan(1.5);
    }
  });

  it("gives the same theme back for the same colours", () => {
    expect(themeFor(tokensFor("mono-dark"), { dark: true })).toBe(themeFor(tokensFor("mono-dark"), { dark: true }));
  });
});
