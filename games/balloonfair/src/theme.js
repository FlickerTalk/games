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
const CREAM = "#FFF6DB";

const SCENERIES = {
  day: { sky: "#BEE8F0", sun: "#FFE584", cloud: WHITE, hill: "#83C96B", hillFar: "#4E9F56" },
  beach: { sky: "#A9E2EC", sun: "#FFE584", cloud: WHITE, sea: "#4BC6D7", wave: "#9DE5ED", sand: "#EBCB83", pier: "#9B6747" },
  evening: { sky: "#303B59", moon: CREAM, star: "#FFD879", ground: "#232C45", booth: "#596581", boothDark: "#232C45" },
};

const STALL = { post: "#9B6747", counter: "#D79A63", plank: "#9B6747", stripe: "#F26B5E", stripeAlt: CREAM, bulb: "#FFD879" };

const ART = {
  ink: INK,
  white: WHITE,
  balloons: {
    round: "#F26B5E", oval: "#4F9BE8", small: "#FFCF3F", big: "#8D7DE8", star: "#FF9E45", cloud: "#F4F5ED",
    knot: "#F26B5E", string: "#6C5848", patch: CREAM, stitch: "#F26B5E", streak: CREAM, shine: WHITE,
  },
  marks: { mine: "#FFE584", theirs: "#B8ACF5" },
  toys: {
    body: "#FFCF3F", wood: "#9B6747", woodLight: "#D79A63", barrel: "#F26B5E", cork: "#B97B4F", corkLight: "#E2AD72", tank: CREAM,
    water: "#3D9BC5", waterLight: "#9DE5ED", nozzle: "#4F9BE8", cup: "#F26B5E", string: CREAM, knob: CREAM,
  },
  effects: { confetti: ["#FFCF3F", "#F26B5E", "#4F9BE8", "#55B987", "#8D7DE8"], puff: "#F4F5ED", miss: CREAM, ring: CREAM, aim: CREAM, aimEnd: "#FFCF3F" },
  gift: { box: "#F39A45", lid: "#F26B5E", ribbon: "#FFE584", ink: INK },
};

function artFor(ui) {
  return { ...ART, sceneries: softStage(SCENERIES, { dark: ui.dark }), stall: softStage(STALL, { dark: ui.dark }), rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 2, thin: 2.5, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
