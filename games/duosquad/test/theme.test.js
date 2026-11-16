import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { oklchOf } from "../../../kit/src/canvas/tone.js";
import { themeFromTokens } from "../../../kit/src/canvas/theme.js";
import { APP_THEMES, tokensFor } from "../../../kit/test/canvas/themes.js";
import { WORLDS, ZONES } from "../src/levels.js";
import { THEME, lookFor, themeFor } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|gr[ae]y|silver|red|blue|green|yellow|orange|purple|pink|brown|transparent)\b(?=["'`])/i;
const CSS_COLOUR = /^(?:#[0-9A-F]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0\.\d+)\))$/;
const PALETTE_FILE = /^(?:theme|worlds\/[a-z]+\/palette)\.js$/;
const THEMES = Object.keys(APP_THEMES).map((name) => [name, themeFor(tokensFor(name), { dark: name.endsWith("-dark") })]);

function leaves(value, path = []) {
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, inner]) => leaves(inner, [...path, key]));
  return [[path.join("."), value]];
}

describe("the theme", () => {
  it("is frozen all the way down, in every theme of the app", () => {
    const frozen = (value) => !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(frozen));
    for (const [name, theme] of [["fallback", THEME], ...THEMES]) expect(frozen(theme), name).toBe(true);
  });

  it("keeps the interface's colours, from the app, apart from the approved art of the three worlds", () => {
    expect(Object.keys(THEME).sort()).toEqual(["art", "font", "stroke", "ui"]);
    expect(Object.keys(THEME.art.worlds).sort()).toEqual([...WORLDS].sort());
    for (const world of WORLDS) {
      expect(Object.keys(THEME.art.worlds[world].zones).sort(), world).toEqual([...ZONES[world]].sort());
      expect(THEME.art.worlds[world].bodies, world).toHaveLength(2);
      expect(lookFor(THEME, world)).toBe(THEME.art.worlds[world]);
    }
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

  it("brings every place down to dusk on a dark page, never lighter than it was drawn, and keeps the crafts, the enemies and their effects as vivid as approved", () => {
    const light = themeFor(tokensFor("mono-light"), { dark: false });
    for (const [name, theme] of THEMES.filter(([one]) => one.endsWith("-dark"))) {
      for (const world of WORLDS) {
        const { zones, ...things } = theme.art.worlds[world];
        const { zones: day, ...same } = light.art.worlds[world];
        expect(things, `${name} ${world}`).toEqual(same);
        for (const [path, colour] of leaves(zones)) {
          const before = leaves(day).find(([one]) => one === path)[1];
          expect(oklchOf(colour).l, `${name} ${world} ${path}`).toBeLessThanOrEqual(Math.max(0.58, 0) + 1e-6);
          expect(oklchOf(colour).l, `${name} ${world} ${path}`).toBeLessThanOrEqual(oklchOf(before).l + 0.02);
        }
      }
      expect(theme.art.rim, name).toBe(theme.ui.rim);
    }
    for (const world of WORLDS) for (const [path, colour] of leaves(light.art.worlds[world].zones)) expect(oklchOf(colour).l, `${world} ${path}`).toBeLessThan(0.93);
  });

  it("names colours only in itself and in each world's palette", () => {
    const files = readdirSync(SRC, { recursive: true }).filter((file) => file.endsWith(".js") && !PALETTE_FILE.test(file.replaceAll("\\", "/")));
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const code = readFileSync(join(SRC, file), "utf8");
      expect(COLOUR.exec(code)?.[0] ?? null, file).toBeNull();
    }
  });
});
