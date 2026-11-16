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

const PADDLES = {
  log: { body: "#9B6747", light: "#D59A68", dark: "#704A3B", leaf: "#55B987", leafLight: "#B8E184" },
  cat: { body: "#FFCF3F", dark: "#E89A2D", ear: "#F58EA6" },
  dog: { body: "#FF9E45", ear: "#704A3B", nose: "#D59A68", collar: "#FFCF3F" },
  rocket: { body: "#8D7DE8", light: "#B8ACF5", dark: "#6356B8", fin: "#FF6B54", window: "#9DE5ED", glass: "#4BC6D7" },
  caterpillar: { body: "#55B987", light: "#B8E184", feeler: "#FFCF3F" },
  cloud: { body: "#9DE5ED", cheek: "#F58EA6" },
};

const TABLES = {
  pond: { ground: "#79D2C5", frame: "#FFF7DF", lily: "#4E9F58", lilyLight: "#B8E184", reed: "#3D8E56", line: "#FFF7DF", near: "#FF6B54", far: "#FFCF3F" },
  ice: { ground: "#DDF3F5", frame: "#FFF7DF", mark: "#A9DFE8", sparkle: "#FFFDF5", line: "#FFF7DF", near: "#FF6B54", far: "#FFCF3F" },
  space: { ground: "#303B59", frame: "#FFF7DF", star: "#FFE584", starCool: "#A9F4E6", planet: "#8D7DE8", planetWarm: "#FF6B54", ring: "#FFE584", line: "#FFF7DF", near: "#FF6B54", far: "#FFCF3F" },
};

const ART = {
  ink: INK,
  white: WHITE,
  paddles: PADDLES,
  ball: { body: "#FF6B54", mark: "#FFE584", trail: "#FFE584" },
  second: { body: "#4BC6D7", mark: WHITE, trail: "#9DE5ED" },
  bubble: { skin: "#9DE5ED", inside: "#79D2C5", shine: WHITE },
  planet: { body: "#FF9E45", ring: "#FFE584", band: "#B8ACF5", spot: "#6356B8", crater: "#D59A68" },
  star: { body: "#FFCF3F", spark: "#FF9E45" },
  snail: { shell: "#F39A45", body: "#B8E184", swirl: "#704A3B", ring: "#B8ACF5" },
  effects: { burst: "#FFCF3F", burstLight: WHITE, splash: "#9DE5ED", confetti: ["#FF6B54", "#FFCF3F", "#4BC6D7", "#8D7DE8", "#55B987"], zone: "#FFCF3F", zoneFill: "#FFE584", hand: "#D59A68", cuff: "#8D7DE8" },
  gift: { paper: "#55B987", paperAlt: "#4BC6D7", ribbon: "#FFCF3F", lid: "#8D7DE8", knot: "#FF9E45", mark: "#FFF7DF" },
};

function artFor(ui) {
  return { ...ART, tables: softStage(TABLES, { dark: ui.dark }), rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 2, thin: 2.5, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
