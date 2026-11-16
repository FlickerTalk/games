// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { FALLBACK_TOKENS, readTokens, themeFromTokens } from "../../src/canvas/theme.js";
import { contrastOf } from "../../src/canvas/tone.js";
import { APP_THEMES, setHostTheme } from "./themes.js";

const CSS = /^(?:#[0-9A-F]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0\.\d+)\))$/;
const COLOURS = ["page", "surface", "surface2", "border", "text", "muted", "accent", "onAccent", "ink", "paper", "pressed", "track", "shade", "halo"];
const root = () => document.documentElement;
const UNREADABLE = { page: "#fbf8f5", text: "#1c1714", muted: "#7d726a", border: "rgba(40, 20, 5, 0.08)", accent: "#e8731f", onAccent: "#ffffff" };

function tokensOf(name) {
  setHostTheme(root(), name);
  return readTokens(root());
}

afterEach(() => setHostTheme(root(), null));

describe("the host's colours", () => {
  it("are read from the variables the app sets on the frame's root", () => {
    const tokens = tokensOf("ember-dark");
    expect(tokens).toMatchObject({ page: "#0d0b0a", text: "#f6efe8", muted: "#9b8f86", border: "rgba(255, 240, 225, 0.07)", accent: "#ffa24c", onAccent: "#1b0f06" });
  });

  it("are none when the host sets none", () => {
    expect(readTokens(root())).toBeNull();
  });
});

describe("the interface palette", () => {
  it("has every colour in every theme of the app, each written one way", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const ui = themeFromTokens(tokensOf(name));
      for (const key of COLOURS) expect(ui[key], `${name} ${key}`).toMatch(CSS);
      expect(ui.dark, name).toBe(name.endsWith("-dark"));
      expect(ui.radius, name).toBe(16);
      expect(ui.line, name).toBeGreaterThanOrEqual(2);
    }
  });

  it("reads at WCAG AA in every theme: text and secondary text on the surfaces, and the accent button", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const ui = themeFromTokens(tokensOf(name));
      for (const ground of ["page", "surface", "surface2"]) {
        expect(contrastOf(ui.text, ui[ground]), `${name} text on ${ground}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastOf(ui.muted, ui[ground]), `${name} muted on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastOf(ui.onAccent, ui.accent), `${name} on the accent`).toBeGreaterThanOrEqual(4.5);
      expect(contrastOf(ui.accent, ui.page), `${name} accent on the page`).toBeGreaterThanOrEqual(3);
      expect(contrastOf(ui.accent, ui.surface), `${name} accent on a surface`).toBeGreaterThanOrEqual(3);
    }
  });

  it("takes the app's own colours where they read, and mixes the surfaces from the text and the page", () => {
    const ui = themeFromTokens(tokensOf("mono-dark"));
    expect(ui).toMatchObject({ page: "#000000", text: "#F5F5F5", muted: "#8E8E8E", accent: "#FFFFFF", onAccent: "#000000", surface: "#0F0F0F", surface2: "#1B1B1B" });
    const light = themeFromTokens(tokensOf("mono-light"));
    expect(light.surface).not.toBe(light.page);
    expect(light.pressed).toBe(light.surface2);
  });

  it("keeps a host's colours that do not read from making the interface unreadable", () => {
    const ui = themeFromTokens(UNREADABLE);
    expect(contrastOf(ui.onAccent, ui.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastOf(ui.accent, ui.page)).toBeGreaterThanOrEqual(3);
  });

  it("falls back on the app's default colours, light or dark, when the host gives none", () => {
    expect(themeFromTokens(null)).toEqual(themeFromTokens(FALLBACK_TOKENS.light));
    expect(themeFromTokens(null, { dark: true })).toEqual(themeFromTokens(FALLBACK_TOKENS.dark));
    expect(themeFromTokens(null, { dark: true }).dark).toBe(true);
    const partial = themeFromTokens({ page: "#000000", text: "#f5f5f5" });
    for (const key of COLOURS) expect(partial[key], key).toMatch(CSS);
  });

  it("rims dark outlines in light only on a dark page, and names the darker and the lighter of text and page", () => {
    const dark = themeFromTokens(tokensOf("aurora-dark"));
    const light = themeFromTokens(tokensOf("aurora-light"));
    expect(dark.rim).toBe(dark.text);
    expect(light.rim).toBeNull();
    expect(dark.ink).toBe(dark.page);
    expect(dark.paper).toBe(dark.text);
    expect(light.ink).toBe(light.text);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(themeFromTokens(tokensOf("lime-dark")))).toBe(true);
  });
});
