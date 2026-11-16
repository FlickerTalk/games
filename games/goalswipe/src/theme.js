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

const FIELDS = {
  school: { sky: "#BEE8F0", cloud: WHITE, track: "#D9785D", trackLight: "#F2A379", fence: INK, ground: "#83C96B", stripe: "#B8E184", line: CREAM },
  beach: { sky: "#E5F6EF", sun: "#FFC846", sea: "#3D9BC5", wave: "#9DE5ED", ground: "#EBCB83", stripe: "#D3A75D", line: CREAM },
  stadium: { sky: "#303B59", stand: "#596581", standAlt: "#6D6688", pole: "#AAB6C4", lamp: CREAM, bulb: "#FFD879", ground: "#83C96B", stripe: "#4E9F58", line: CREAM },
};

const ART = {
  ink: INK,
  white: WHITE,
  goal: { post: WHITE, net: "#E9F2E8", netShade: "#AAB6C4", back: "rgba(255, 253, 245, 0.18)" },
  ball: { body: WHITE, dark: "#39475A", coral: "#F26B5E", sun: "#FFCF3F", cyan: "#4BC6D7", star: "#FFC846", trail: CREAM },
  target: { tyre: "#39475A", hub: "#CBD5D5", stud: "#AAB6C4", bell: "#FFC846", clapper: "#F26B5E", cord: CREAM },
  glove: "#FFF3C4",
  effects: {
    swipe: "#FFE584", swipeCore: WHITE, ring: "#F26B5E", ringFill: "rgba(255, 253, 245, 0.25)", caught: "#55B987", ripple: WHITE,
    star: "#FFC846", starAlt: "#FF9E45", halo: "#FFE584", haloEdge: WHITE, confetti: ["#F26B5E", "#4BC6D7", "#FFCF3F", "#8D7DE8"],
  },
  crowd: ["#FFCF3F", "#F26B5E", "#4BC6D7", "#B8ACF5"],
  gift: { box: "#F08AA5", lid: "#F39A45", ribbon: "#FFE584", ink: INK },
};

function artFor(ui) {
  return { ...ART, fields: softStage(FIELDS, { dark: ui.dark }), rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
