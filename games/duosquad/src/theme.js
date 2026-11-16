import { FONT, oklchOf, softDay, themeFromTokens } from "../../../kit/src/canvas/index.js";
import { LAND } from "./land-palette.js";
import { SEA } from "./sea-palette.js";
import { SPACE } from "./space-palette.js";

const PALETTES = { space: SPACE, sea: SEA, land: LAND };

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const ART = {
  gift: { box: "#F39A45", lid: "#F26B5E", ribbon: "#FFE584", ink: "#243247" },
  confetti: ["#F4C95D", "#65D6D0", "#8FA7FF", "#F26B5E", "#79D8B0"],
};

// A place that is already night stays as dark as it was drawn: the soft day only ever brings a colour down.
function calm(colour, mode) {
  const soft = softDay(colour, mode);
  return mode.dark && oklchOf(colour).l <= oklchOf(soft).l ? softDay(colour, { dark: false }) : soft;
}

function settle(palette, mode) {
  if (typeof palette === "string") return calm(palette, mode);
  return Object.fromEntries(Object.entries(palette).map(([key, value]) => [key, settle(value, mode)]));
}

function lookOf(palette, mode) {
  const { zones, ...things } = palette;
  return { ...structuredClone(things), zones: settle(zones, mode) };
}

function artFor(ui) {
  const worlds = Object.fromEntries(Object.entries(PALETTES).map(([world, palette]) => [world, lookOf(palette, { dark: ui.dark })]));
  return { ...structuredClone(ART), worlds, rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 2, thin: 2.5, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);

export const lookFor = (theme, world) => theme.art.worlds[world] ?? theme.art.worlds.space;
