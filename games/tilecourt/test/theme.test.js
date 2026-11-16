import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME } from "../src/theme.js";

const SRC = join(import.meta.dirname, "..", "src");
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|gr[ae]y|silver|red|blue|green|yellow|orange|purple|pink|brown|transparent)\b(?=["'`])/i;
const CSS_COLOUR = /^(?:#[0-9A-F]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0\.\d+)\))$/;

function leaves(value, path = []) {
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, inner]) => leaves(inner, [...path, key]));
  return [[path.join("."), value]];
}

describe("the theme", () => {
  it("is frozen all the way down", () => {
    const frozen = (value) => !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(frozen));
    expect(frozen(THEME)).toBe(true);
  });

  it("keeps the interface's tokens apart from the play field's", () => {
    expect(Object.keys(THEME).sort()).toEqual(["art", "font", "stroke", "ui"]);
    for (const key of ["ink", "surface", "card", "track", "button", "pressed", "accent", "star", "starEmpty", "icon", "off", "shade", "shadow"]) expect(THEME.ui, key).toHaveProperty(key);
    for (const key of ["ink", "tiles", "stone", "stoneLight", "grout", "edge", "valid", "glow", "scenery", "effects"]) expect(THEME.art, key).toHaveProperty(key);
    expect(THEME.art.tiles).toHaveLength(4);
    expect(Object.keys(THEME.art.scenery).sort()).toEqual(["greenhouse", "night", "patio", "rooftop", "seaside"]);
  });

  it("writes every colour one way, and every size as a number", () => {
    for (const [path, value] of leaves(THEME)) {
      if (path === "font") continue;
      if (typeof value === "string") expect(value, path).toMatch(CSS_COLOUR);
      else expect(Number.isFinite(value), path).toBe(true);
    }
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
