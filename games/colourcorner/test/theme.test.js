import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { oklchOf } from "../../../kit/src/canvas/tone.js";
import { themeFromTokens } from "../../../kit/src/canvas/theme.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { PAINT_KEYS, THEME, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|gr[ae]y|silver|red|blue|green|yellow|orange|purple|pink|brown|transparent)\b(?=["'`])/i;
const CSS_COLOUR = /^(?:#[0-9A-F]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0\.\d+)\))$/;
const THEMES = Object.keys(APP_THEMES).map((name) => [name, themeFor(tokensFor(name))]);

function leaves(value, path = []) {
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, inner]) => leaves(inner, [...path, key]));
  return [[path.join("."), value]];
}

describe("the theme", () => {
  it("is frozen all the way down, in every theme of the app", () => {
    const frozen = (value) => !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(frozen));
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) expect(frozen(theme), name).toBe(true);
  });

  it("keeps the interface's tokens apart from the art, the interface from the app's colours", () => {
    expect(Object.keys(THEME).sort()).toEqual(["art", "font", "stroke", "ui"]);
    for (const key of ["ink", "paper", "papers", "paints", "rainbow", "glitter", "pot", "books", "frames", "markers", "present", "confetti", "miss"]) expect(THEME.art, key).toHaveProperty(key);
    for (const [name, theme] of THEMES) expect(theme.ui, name).toEqual(themeFromTokens(tokensFor(name)));
    expect(THEME.ui).toEqual(themeFromTokens(null));
    expect(themeFor(tokensFor("lime-dark"))).toBe(themeFor(tokensFor("lime-dark")));
  });

  it("offers at least sixteen paints, skin tones in several shades among them, each with a name kept for ever", () => {
    expect(PAINT_KEYS.length).toBeGreaterThanOrEqual(16);
    expect(THEME.art.paints).toHaveLength(PAINT_KEYS.length);
    expect(PAINT_KEYS.filter((key) => key.startsWith("skin"))).toHaveLength(4);
    expect(PAINT_KEYS.slice(0, 4)).toEqual(["red", "coral", "orange", "yellow"]);
    expect(new Set(THEME.art.paints).size).toBe(PAINT_KEYS.length);
  });

  it("writes every colour one way, and every size as a number", () => {
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) {
      for (const [path, value] of leaves(theme)) {
        if (path === "font" || typeof value === "boolean" || value === null) continue;
        if (typeof value === "string") expect(value, `${name} ${path}`).toMatch(CSS_COLOUR);
        else expect(Number.isFinite(value), `${name} ${path}`).toBe(true);
      }
    }
  });

  it("softens the paper on a dark page and keeps every paint as vivid as approved", () => {
    const light = themeFor(tokensFor("mono-light"));
    expect(oklchOf(light.art.paper).l).toBeGreaterThan(0.88);
    expect(oklchOf(light.art.paper).l).toBeLessThan(0.95);
    expect(light.art.rim).toBeNull();
    for (const [name, theme] of THEMES.filter(([one]) => one.endsWith("-dark"))) {
      expect(oklchOf(theme.art.paper).l, name).toBeLessThanOrEqual(0.62);
      expect(oklchOf(theme.art.papers.light).l, name).toBeLessThanOrEqual(0.62);
      expect(theme.art.papers.dark, name).toBe(light.art.papers.dark);
      expect(theme.art.paints, name).toEqual(light.art.paints);
      expect(theme.art.rim, name).toBe(theme.ui.rim);
    }
  });

  it("is the only source file that names a colour, the paints' translated names aside", () => {
    const files = readdirSync(SRC, { recursive: true }).filter((file) => file.endsWith(".js") && !["theme.js", "texts.js"].includes(file));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const code = readFileSync(join(SRC, file), "utf8");
      expect(COLOUR.exec(code)?.[0] ?? null, file).toBeNull();
    }
  });
});
