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
const THEMES = Object.keys(APP_THEMES).map((name) => [name, themeFor(tokensFor(name))]);

function leaves(value, path = []) {
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, inner]) => leaves(inner, [...path, key]));
  return [[path.join("."), value]];
}

describe("the theme", () => {
  it("is frozen all the way down, in every theme of the app, and made once per theme", () => {
    const frozen = (value) => !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(frozen));
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) expect(frozen(theme), name).toBe(true);
    expect(themeFor(tokensFor("lime-dark"))).toBe(themeFor(tokensFor("lime-dark")));
  });

  it("keeps the interface in the app's colours and the play field in the approved toy colours", () => {
    expect(Object.keys(THEME).sort()).toEqual(["art", "font", "ui"]);
    for (const [name, theme] of THEMES) expect(theme.ui, name).toEqual(themeFromTokens(tokensFor(name)));
    for (const key of ["ink", "player", "rival", "tire", "coral", "azure", "mint", "duck", "submarine", "kelp", "reef", "parachute"]) expect(THEME.art, key).toHaveProperty(key);
    expect(Object.keys(THEME.art.scenery).sort()).toEqual(["desert", "meadow", "snow"]);
    for (const scenery of Object.values(THEME.art.scenery)) expect(Object.keys(scenery).sort()).toEqual(["cloud", "distant", "floor", "floorDark", "ground", "groundDark", "sky", "water", "waterDark", "waterLight"]);
  });

  it("writes every colour one way", () => {
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) {
      for (const [path, value] of leaves(theme)) {
        if (path === "font" || typeof value === "boolean" || value === null || typeof value === "number") continue;
        expect(value, `${name} ${path}`).toMatch(CSS_COLOUR);
      }
    }
  });

  it("brings the stage down to mid lightness on a dark page, keeps the toys and the paint as vivid as approved, and rims the outlines there", () => {
    const light = themeFor(tokensFor("mono-light"));
    for (const [name, theme] of THEMES.filter(([one]) => one.endsWith("-dark"))) {
      for (const [kind, scenery] of Object.entries(theme.art.scenery)) {
        for (const key of ["sky", "ground", "water", "distant"]) expect(oklchOf(scenery[key]).l, `${name} ${kind} ${key}`).toBeLessThanOrEqual(0.6);
      }
      const { scenery: _one, rim, ...toys } = theme.art;
      const { scenery: _two, rim: _three, ...approved } = light.art;
      expect(toys, name).toEqual(approved);
      expect(rim, name).toBe(theme.ui.rim);
    }
    expect(light.art.rim).toBeNull();
    for (const scenery of Object.values(light.art.scenery)) expect(oklchOf(scenery.sky).l).toBeLessThan(0.93);
  });

  it("is the only source file that names a colour", () => {
    const files = readdirSync(SRC).filter((file) => file.endsWith(".js") && file !== "theme.js");
    expect(files.length).toBeGreaterThan(3);
    for (const file of files) expect(COLOUR.exec(readFileSync(join(SRC, file), "utf8"))?.[0] ?? null, file).toBeNull();
  });
});
