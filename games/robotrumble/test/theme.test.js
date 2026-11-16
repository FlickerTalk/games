import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { oklchOf } from "../../../kit/src/canvas/tone.js";
import { themeFromTokens } from "../../../kit/src/canvas/theme.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { THEME, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|gr[ae]y|silver|red|blue|green|yellow|orange|purple|pink|brown|transparent)\b(?=["'`])/i;
const CSS_COLOUR = /^(?:#[0-9A-F]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0\.\d+)\))$/;
const THEMES = Object.keys(APP_THEMES).map((name) => [name, themeFor(tokensFor(name), { dark: name.endsWith("-dark") })]);
const VIVID = ["robots", "metal", "screen", "glove", "boot", "propeller", "shield", "battery", "effects", "gift"];

function leaves(value, path = []) {
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, inner]) => leaves(inner, [...path, key]));
  return [[path.join("."), value]];
}

describe("the theme", () => {
  it("is frozen all the way down, in every theme of the app", () => {
    const frozen = (value) => !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(frozen));
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) expect(frozen(theme), name).toBe(true);
  });

  it("keeps the interface's colours, from the app, apart from the approved art of the robots and their stages", () => {
    expect(Object.keys(THEME).sort()).toEqual(["art", "font", "stroke", "ui"]);
    for (const key of ["ink", "white", "stages", ...VIVID]) expect(THEME.art, key).toHaveProperty(key);
    expect(Object.keys(THEME.art.stages).sort()).toEqual(["box", "kitchen", "shelf"]);
    expect(Object.keys(THEME.art.robots).sort()).toEqual(["coral", "grape", "mint", "sun"]);
    for (const [name, theme] of THEMES) expect(theme.ui, name).toEqual(themeFromTokens(tokensFor(name), { dark: name.endsWith("-dark") }));
    expect(themeFor(tokensFor("lime-dark"), { dark: true })).toBe(themeFor(tokensFor("lime-dark"), { dark: true }));
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

  it("brings the stages down to dusk on a dark page and keeps the robots, their gloves and the effects as vivid as approved", () => {
    const light = themeFor(tokensFor("mono-light"), { dark: false });
    for (const [name, theme] of THEMES.filter(([one]) => one.endsWith("-dark"))) {
      for (const stage of Object.keys(theme.art.stages)) {
        expect(oklchOf(theme.art.stages[stage].wall).l, `${name} ${stage}`).toBeLessThanOrEqual(0.58);
        expect(oklchOf(theme.art.stages[stage].floor).l, `${name} ${stage}`).toBeLessThanOrEqual(0.58);
      }
      for (const key of VIVID) expect(theme.art[key], `${name} ${key}`).toEqual(light.art[key]);
      expect(theme.art.rim, name).toBe(theme.ui.rim);
    }
    expect(light.art.rim).toBeNull();
    expect(oklchOf(light.art.stages.shelf.wall).l).toBeLessThan(0.93);
  });

  it("is the only source file that names a colour", () => {
    const files = readdirSync(SRC, { recursive: true }).filter((file) => file.endsWith(".js") && file !== "theme.js");
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const code = readFileSync(join(SRC, file), "utf8");
      expect(COLOUR.exec(code)?.[0] ?? null, file).toBeNull();
    }
  });
});
