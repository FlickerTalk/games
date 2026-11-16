import { FONT, softDay, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";
const WHITE = "#FFFDF5";
const CREAM = "#FFF7DF";
const GLASS = "#A9DFE8";
const RED = "#F26B5E";
const RED_LIGHT = "#FF9A85";
const BLUE = "#4F9BE8";
const YELLOW = "#FFCF3F";
const YELLOW_LIGHT = "#FFE584";
const GREEN = "#55B987";
const GREEN_LIGHT = "#A9E1B7";
const PURPLE = "#8D7DE8";
const PURPLE_LIGHT = "#B8ACF5";
const ORANGE = "#F39A45";
const ORANGE_LIGHT = "#FFB15C";
const TEAL = "#38B7B0";
const TEAL_LIGHT = "#A9F4E6";
const STAR = "#FFC846";

const ART = freeze({
  ink: INK,
  white: WHITE,
  cream: CREAM,
  glass: GLASS,
  wheel: { tire: "#2C3444", hub: "#AAB6C4" },
  rail: { top: INK, low: "#596575", shine: WHITE, sleeper: "#9B6747" },
  wagons: [
    { body: RED, light: RED_LIGHT },
    { body: BLUE, light: GLASS },
    { body: YELLOW, light: YELLOW_LIGHT },
    { body: GREEN, light: GREEN_LIGHT },
    { body: PURPLE, light: PURPLE_LIGHT },
    { body: ORANGE, light: ORANGE_LIGHT },
    { body: "#ED83A8", light: "#FFC0D2" },
    { body: TEAL, light: TEAL_LIGHT },
  ],
  jingle: YELLOW,
  engines: {
    steam: { body: RED, cab: YELLOW, trim: INK, cheek: RED_LIGHT },
    rocket: { body: PURPLE, cab: ORANGE, trim: PURPLE_LIGHT, cheek: GLASS },
    caterpillar: { body: GREEN, cab: GREEN_LIGHT, trim: YELLOW, cheek: GREEN_LIGHT },
    teapot: { body: BLUE, cab: YELLOW, trim: YELLOW, cheek: GLASS },
    whale: { body: TEAL, cab: TEAL_LIGHT, trim: TEAL_LIGHT, cheek: TEAL_LIGHT },
    dragon: { body: ORANGE, cab: YELLOW, trim: RED_LIGHT, cheek: ORANGE_LIGHT },
  },
  dot: INK,
  puff: WHITE,
  wrong: "#FF6B54",
  burst: { star: STAR, ray: RED, rayAlt: TEAL },
  confetti: [YELLOW, RED, GREEN, BLUE, PURPLE],
  present: { box: PURPLE, lid: PURPLE_LIGHT, ribbon: YELLOW, ink: INK },
});

const SCENERIES = freeze({
  valley: { sky: "#BEE8F0", cloud: WHITE, far: "#B8E184", near: "#83C96B", ground: "#83C96B", light: YELLOW, tree: "#3D8E56", treeLight: "#6DBC60", trunk: "#9B6747", wall: CREAM, roof: RED, door: BLUE, window: GLASS, clock: "#FFF8E8", star: STAR },
  desert: { sky: "#BEE8F0", cloud: WHITE, far: "#EBCB83", near: "#D3A75D", ground: "#EBCB83", light: YELLOW, tree: "#4E9B68", treeLight: "#4E9B68", trunk: "#9B6747", wall: CREAM, roof: RED, door: BLUE, window: GLASS, clock: "#FFF8E8", star: STAR },
  night: { sky: "#303B59", cloud: "#45516C", far: "#45516C", near: "#45516C", ground: "#45516C", light: CREAM, tree: "#45516C", treeLight: "#45516C", trunk: "#9B6747", wall: "#45516C", roof: PURPLE, door: INK, window: STAR, clock: "#FFF8E8", star: STAR },
});

const GLOWS = ["light", "window", "star"];
const GROUND = ["ground", "near"];

function sceneryFor(look, mode) {
  const tone = (key, colour) => (GLOWS.includes(key) ? colour : softDay(colour, GROUND.includes(key) ? { ...mode, deeper: 0.08 } : mode));
  return Object.fromEntries(Object.entries(look).map(([key, colour]) => [key, tone(key, colour)]));
}

function artFor(ui) {
  const mode = { dark: ui.dark };
  const sceneries = Object.fromEntries(Object.entries(SCENERIES).map(([name, look]) => [name, sceneryFor(look, mode)]));
  return { ...ART, sceneries, rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, text: { digit: 22 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
