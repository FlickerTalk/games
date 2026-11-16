import { FONT, softDay, softStage, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";
const CREAM = "#FFF7DF";
const WHITE = "#FFFDF5";
const CORAL = "#FF6B54";
const SUN = "#FFCF3F";
const SUN_LIGHT = "#FFE584";
const VIOLET = "#8D7DE8";
const VIOLET_LIGHT = "#B8ACF5";
const VIOLET_DARK = "#6356B8";
const TROPHY = "#FFC846";
const LEAF = "#55B987";
const CYAN = "#4BC6D7";

const ART = freeze({
  ink: INK,
  white: WHITE,
  cream: CREAM,
  spring: { coil: "#F26B5E", badge: CORAL, digit: WHITE },
  turbo: CYAN,
  puddle: { water: "#3D9BC5", light: "#9DE5ED" },
  snail: { shell: "#F39A45", swirl: SUN_LIGHT, body: "#A96F50" },
  sides: [
    { plate: SUN, light: SUN_LIGHT, dark: "#E89A2D" },
    { plate: VIOLET, light: VIOLET_LIGHT, dark: VIOLET_DARK },
  ],
  dice: {
    cream: { face: CREAM, pip: INK },
    sky: { face: "#A9DFE8", pip: INK },
    mint: { face: "#A6DDBF", pip: INK },
    rose: { face: "#F8B9C9", pip: INK },
  },
  rivalDice: { face: VIOLET_LIGHT, pip: VIOLET_DARK },
  chosen: { halo: SUN_LIGHT, ring: CORAL },
  burst: { ray: SUN, star: TROPHY },
  miss: CORAL,
  dust: CREAM,
  confetti: [CORAL, SUN, CYAN, VIOLET, LEAF],
  present: { box: "#F26B5E", lid: SUN_LIGHT, ribbon: SUN_LIGHT, ink: INK },
});

const TRACK = freeze({ square: "#FFF6DB", edge: "#D9CDA9", lit: SUN_LIGHT, finish: TROPHY, flag: WHITE });

const SCENERIES = freeze({
  garden: { ground: "#B8E184", patch: "#83C96B", leaf: LEAF, leafDark: "#3D8E56", leafLight: "#B8E184", trunk: "#9B6747", petal: "#F49BB4", petalAlt: WHITE, heart: SUN, cloud: WHITE },
  city: { ground: "#B9C8D6", sky: "#BEE8F0", tower: "#8EA3B8", towerDark: "#596581", window: "#FFD879", lamp: "#FFD879" },
  moon: { ground: "#353D54", star: "#F0EEF8", rock: "#D9D7E8", rockDark: "#AAA8C5", flag: CORAL },
});

function trackFor(mode) {
  const square = softDay(TRACK.square, { ...mode, deeper: mode.dark ? 0.1 : 0 });
  return {
    square,
    edge: softDay(TRACK.edge, { ...mode, deeper: mode.dark ? 0.16 : 0 }),
    line: mode.dark ? softDay(TRACK.edge, mode) : INK,
    digit: mode.dark ? WHITE : INK,
    lit: TRACK.lit,
    litDigit: INK,
    finish: TRACK.finish,
    flag: TRACK.flag,
  };
}

function artFor(ui) {
  const mode = { dark: ui.dark };
  return { ...ART, track: trackFor(mode), sceneries: softStage(SCENERIES, mode), rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, text: { digit: 20 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
