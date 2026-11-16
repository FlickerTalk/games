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
  it("is frozen all the way down, in every theme of the app", () => {
    const frozen = (value) => !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(frozen));
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) expect(frozen(theme), name).toBe(true);
  });

  it("keeps the interface's colours apart from the water's, the interface from the app's colours", () => {
    expect(Object.keys(THEME).sort()).toEqual(["art", "font", "stroke", "ui"]);
    for (const key of ["ink", "creatures", "glow", "detail", "hook", "charms", "bucket", "finds", "splash", "star", "days", "pier", "boat", "window", "silhouette", "rim"]) expect(THEME.art, key).toHaveProperty(key);
    expect(THEME.art.creatures).toHaveLength(24);
    expect(Object.keys(THEME.art.days).sort()).toEqual(["morning", "night", "sunset"]);
    for (const [name, theme] of THEMES) expect(theme.ui, name).toEqual(themeFromTokens(tokensFor(name)));
    expect(THEME.ui).toEqual(themeFromTokens(null));
    expect(themeFor(tokensFor("lime-dark"))).toBe(themeFor(tokensFor("lime-dark")));
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

  it("brings the sky, the water and the pier down to mid lightness on a dark page, and keeps the creatures as vivid as approved", () => {
    const light = themeFor(tokensFor("mono-light"));
    for (const [name, theme] of THEMES.filter(([one]) => one.endsWith("-dark"))) {
      for (const [day, colours] of Object.entries(theme.art.days)) {
        for (const key of ["sky", "water", "deep", "sand"]) expect(oklchOf(colours[key]).l, `${name} ${day} ${key}`).toBeLessThanOrEqual(0.6);
      }
      expect(oklchOf(theme.art.pier.wood).l, name).toBeLessThanOrEqual(0.5);
      expect(theme.art.creatures, name).toEqual(light.art.creatures);
      expect(theme.art.charms, name).toEqual(light.art.charms);
      expect(theme.art.rim, name).toBe(theme.ui.rim);
    }
    expect(light.art.rim).toBeNull();
    expect(oklchOf(light.art.days.morning.sky).l).toBeLessThan(0.9);
    expect(oklchOf(light.art.days.morning.sky).l).toBeGreaterThan(0.8);
  });

  it("draws an album's empty places in a quiet tone of the app's own colours", () => {
    for (const [name, theme] of THEMES) expect(theme.art.silhouette, name).not.toBe(theme.ui.surface);
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
