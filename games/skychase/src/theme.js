import { FONT, softStage, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";
const WHITE = "#FFFDF5";

const SKIES = {
  morning: { sky: "#BEE8F0", near: "#83C96B", far: "#B8E184", deep: "#4E9F58", dot: "#4E9F58", dotLight: "#B8E184", light: "#FFE584" },
  desert: { sky: "#BEE8F0", near: "#EBCB83", far: "#D3A75D", deep: "#D3A75D", dot: "#B68B68", dotLight: "#EBCB83", light: "#FFE584" },
  snow: { sky: "#BEE8F0", near: "#EAF5F5", far: "#C8E0E5", deep: "#C8E0E5", dot: "#C8E0E5", dotLight: "#FFFDF5", light: "#FFE584" },
  night: { sky: "#303B59", near: "#232C45", far: "#232C45", deep: "#232C45", dot: "#596581", dotLight: "#6D6688", light: "#F5E7C6" },
  sea: { sky: "#65B8C7", near: "#7DAA75", far: "#B8E184", deep: "#438FA8", dot: "#7DAA75", dotLight: "#E8F5E9", light: "#E8F5E9" },
};

const WEATHER = { cloud: "#FFF9E9", cloudLight: "#FFFDF5", wind: "#FFFDF5" };

const ART = {
  ink: INK,
  white: WHITE,
  colours: {
    sunny: { body: "#FFCF3F", light: "#FFE584", dark: "#E89A2D" },
    coral: { body: "#F26B5E", light: "#FFB49B", dark: "#D0503F" },
    ocean: { body: "#4F9BE8", light: "#A9DFE8", dark: "#3577C2" },
    mint: { body: "#55B987", light: "#B8E184", dark: "#3F786E" },
    lilac: { body: "#8D7DE8", light: "#B8ACF5", dark: "#6356B8" },
  },
  craft: { glass: "#A9DFE8", glassDark: "#4BC6D7", blade: "#F5E7C6", hub: "#FFB15C", metal: "#AAB6C4", float: "#4F9BE8", trim: "#F26B5E", puff: "#FFF9E9", window: "#FFD879" },
  balloons: { round: ["#FFCF3F", "#F26B5E", "#4F9BE8"], squared: ["#8D7DE8", "#B8ACF5", "#F26B5E"], gone: "#CBD5D5", knot: "#F26B5E" },
  rainbow: ["#F26B5E", "#F39A45", "#FFCF3F", "#55B987", "#4F9BE8", "#8D7DE8"],
  airship: { body: "#F5E7C6", top: "#F26B5E", fin: "#FFE584", cabin: "#8D7DE8", glass: "#A9DFE8" },
  effects: {
    ring: "#FFF7DF", shut: "#FF6B54", cork: "#C98D58", corkLight: "#E8B878", trail: "#FFB15C", marker: "#FFF7DF", markerArc: "#FFE584",
    confetti: ["#FFCF3F", "#F26B5E", "#4F9BE8", "#8D7DE8", "#55B987"],
    hand: "#F2BE8D", knuckle: "#C9835A", parachute: "#F26B5E", flag: "#FFF7DF", spark: "#FFFDF5",
  },
  gift: { box: "#B8ACF5", lid: "#8D7DE8", ribbon: "#FFCF3F", ink: INK },
};

function artFor(ui) {
  return { ...ART, skies: softStage(SKIES, { dark: ui.dark }), weather: softStage(WEATHER, { dark: ui.dark }), rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
