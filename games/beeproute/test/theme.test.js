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
  it("is frozen all the way down, and made once for each set of the app's colours", () => {
    const frozen = (value) => !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(frozen));
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) expect(frozen(theme), name).toBe(true);
    expect(themeFor(tokensFor("lime-dark"))).toBe(themeFor(tokensFor("lime-dark")));
  });

  it("keeps the interface apart from the play field, the interface in the app's colours", () => {
    expect(Object.keys(THEME).sort()).toEqual(["art", "font", "stroke", "text", "ui"]);
    for (const key of ["ink", "robots", "worlds", "puddle", "battery", "goal", "door", "wrong", "running", "confetti", "present", "rim"]) expect(THEME.art, key).toHaveProperty(key);
    expect(Object.keys(THEME.art.robots)).toEqual(["box", "capsule", "wide", "cone", "ball", "star"]);
    expect(Object.keys(THEME.art.worlds)).toEqual(["workshop", "garden", "space"]);
    for (const [name, theme] of THEMES) expect(theme.ui, name).toEqual(themeFromTokens(tokensFor(name)));
    expect(THEME.ui).toEqual(themeFromTokens(null));
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

  it("brings the worlds down to dusk on a dark page, the floor a little deeper, and keeps the robots and what they collect as vivid as approved", () => {
    const light = themeFor(tokensFor("mono-light"));
    for (const [name, theme] of THEMES.filter(([one]) => one.endsWith("-dark"))) {
      for (const [world, look] of Object.entries(theme.art.worlds)) {
        expect(oklchOf(look.background).l, `${name} ${world}`).toBeLessThanOrEqual(0.58);
        expect(oklchOf(look.floor).l, `${name} ${world}`).toBeLessThanOrEqual(0.5);
      }
      expect(theme.art.robots, name).toEqual(light.art.robots);
      expect(theme.art.battery, name).toEqual(light.art.battery);
      expect(theme.art.puddle, name).toEqual(light.art.puddle);
      expect(theme.art.rim, name).toBe(theme.ui.rim);
    }
    expect(light.art.rim).toBeNull();
    expect(oklchOf(light.art.worlds.workshop.floor).l).toBeLessThan(0.93);
  });

  it("is the only source file that names a colour", () => {
    const files = readdirSync(SRC).filter((file) => file.endsWith(".js") && file !== "theme.js");
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) expect(COLOUR.exec(readFileSync(join(SRC, file), "utf8"))?.[0] ?? null, file).toBeNull();
  });
});
