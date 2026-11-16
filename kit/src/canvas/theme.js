import { contrastOf, cssOf, mixColours, readableOn, rgbaOf } from "./tone.js";

export const HOST_VARIABLES = Object.freeze({
  page: "--ion-background-color",
  text: "--ion-text-color",
  muted: "--ion-color-medium",
  border: "--ion-border-color",
  accent: "--ion-color-primary",
  onAccent: "--ion-color-primary-contrast",
});

export const FALLBACK_TOKENS = Object.freeze({
  light: Object.freeze({ page: "#ffffff", text: "#0a0a0a", muted: "#6e6e6e", border: "rgba(0, 0, 0, 0.10)", accent: "#000000", onAccent: "#ffffff" }),
  dark: Object.freeze({ page: "#000000", text: "#f5f5f5", muted: "#8e8e8e", border: "rgba(255, 255, 255, 0.12)", accent: "#ffffff", onAccent: "#000000" }),
});

const RADIUS = 16;
const LINE = 2;

function hostColour(root, name) {
  const view = root.ownerDocument?.defaultView ?? globalThis;
  return (view.getComputedStyle?.(root).getPropertyValue(name) || root.style?.getPropertyValue(name) || "").trim();
}

export function readTokens(root) {
  if (!root || !hostColour(root, HOST_VARIABLES.page)) return null;
  const found = Object.entries(HOST_VARIABLES).map(([key, name]) => [key, hostColour(root, name)]);
  return Object.fromEntries(found.filter(([, value]) => value));
}

const opaque = (colour) => cssOf([...rgbaOf(colour).slice(0, 3), 1]);
const withAlpha = (colour, alpha) => cssOf([...rgbaOf(colour).slice(0, 3), alpha]);
const darkPage = (page) => contrastOf(page, "#000000") < contrastOf(page, "#FFFFFF");

function legible(colour, grounds, ratio) {
  let found = colour;
  for (const ground of grounds) if (contrastOf(found, ground) < ratio) found = readableOn(found, ground, ratio);
  return found;
}

// Surfaces are mixed from text and page, as the turn-based kit mixes them: in mono light the app's own card surface is the page itself.
function surfaces(text, page) {
  return { surface: mixColours(text, page, 0.06), surface2: mixColours(text, page, 0.11) };
}

export function themeFromTokens(tokens, { dark = false } = {}) {
  const host = tokens && rgbaOf(tokens.page) ? tokens : null;
  const isDark = host ? darkPage(opaque(host.page)) : dark;
  const fallback = FALLBACK_TOKENS[isDark ? "dark" : "light"];
  const given = (key) => (host && rgbaOf(host[key]) ? host[key] : fallback[key]);
  const page = opaque(given("page"));
  const { surface, surface2 } = surfaces(opaque(given("text")), page);
  const text = legible(opaque(given("text")), [surface2, surface, page], 4.5);
  const muted = legible(contrastOf(opaque(given("muted")), surface2) >= 4.5 ? opaque(given("muted")) : mixColours(text, page, 0.64), [surface2, surface, page], 4.5);
  const accent = legible(opaque(given("accent")), [page, surface], 3);
  const onAccent = legible(opaque(given("onAccent")), [accent], 4.5);
  const [ink, paper] = contrastOf(text, "#000000") < contrastOf(page, "#000000") ? [text, page] : [page, text];
  return Object.freeze({
    dark: isDark,
    page,
    surface,
    surface2,
    border: cssOf(rgbaOf(given("border"))),
    text,
    muted,
    accent,
    onAccent,
    ink,
    paper,
    pressed: surface2,
    track: surface2,
    shade: withAlpha(page, 0.72),
    halo: withAlpha(accent, 0.3),
    rim: isDark ? text : null,
    radius: RADIUS,
    line: LINE,
  });
}
