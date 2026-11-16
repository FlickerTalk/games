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

const ROBOTS = {
  sun: { main: "#FFCF3F", light: "#FFE584", dark: "#E89A2D" },
  grape: { main: "#8D7DE8", light: "#B8ACF5", dark: "#6356B8" },
  mint: { main: "#63C7A5", light: "#A7E6C9", dark: "#3C957D" },
  coral: { main: "#F26B5E", light: "#FF9B82", dark: "#C94F4B" },
};

const STAGES = {
  shelf: { wall: "#FFF0C6", floor: "#EBCB83", edge: "#B88656", board: "#B88656", boardLight: "#F1CD91", toy: "#F26B5E", toyDot: "#FFCF3F", ball: "#73C9E8", shine: "#FFFDF5" },
  kitchen: { wall: "#CDE8E5", floor: "#E89A78", edge: "#C94F4B", tile: "#F8F3DF", mug: "#FFCF3F", plate: "#FFF7DF", food: "#73C9E8" },
  box: { wall: "#F1CD91", floor: "#D9A86C", edge: "#A97447", side: "#D9A86C", fold: "#A97447", tape: "#FFF7DF", hole: "#F1CD91" },
};

const ART = {
  ink: INK,
  white: WHITE,
  robots: ROBOTS,
  metal: { tire: "#2C3444", hub: "#AAB6C4" },
  screen: "#263858",
  glove: { body: "#F26B5E", cuff: WHITE },
  boot: { body: "#263858", sole: WHITE },
  propeller: { blade: "#73C9E8", knob: "#FFCF3F" },
  shield: { body: "#A9E4EA", light: "#E4FAF7" },
  battery: { full: "#75D69C", low: "#FFB15C" },
  effects: { star: "#FFCF3F", spark: WHITE, motion: WHITE, ghost: "#D9E5EA", confetti: ["#FFCF3F", "#F26B5E", "#63C7A5", "#8D7DE8", "#73C9E8"] },
  gift: { box: "#B8ACF5", lid: "#8D7DE8", ribbon: "#FFCF3F", ink: INK },
};

function artFor(ui) {
  return { ...ART, stages: softStage(STAGES, { dark: ui.dark }), rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 2, thin: 2.5, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
