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
const CREAM = "#F5E7C6";
const AMBER = "#FFB15C";

const SCENERIES = {
  castle: {
    sky: "#BEE8F0", cloud: WHITE, wall: "#D9D5C7", brick: "#8F9897", grass: "#83C96B", mound: "#B8E184", blade: "#4E9F58",
    flag: "#F26B5E", line: INK, shade: "#52665B",
  },
  pillows: {
    wall: CREAM, floor: "#9DCFD8", rug: "#F6D788", tent: "#F5B7B0", sheet: "#F6D788", pillow: "#F5B7B0", pillowAlt: "#9DCFD8",
    seam: WHITE, flag: "#F26B5E", flagAlt: "#FFCF3F", line: INK, shade: "#52665B",
  },
  treehouse: {
    sky: "#E5F6EF", water: "#75C7D5", ripple: WHITE, leaf: "#3D8E56", leafLight: "#6DBC60", wood: "#B8845D", plank: "#D8AA75",
    rope: "#E8D3A4", line: INK, shade: "#52665B",
  },
};

const ART = {
  ink: INK,
  white: WHITE,
  foam: {
    blades: { broad: "#62C6D4", curved: "#F49AA5", paddle: "#FFCF3F", block: "#62C6D4", wavy: "#A8DFAE", long: "#F49AA5" },
    grip: "#E89A2D", guard: AMBER, shine: WHITE,
  },
  balloons: { mine: "#F26B5E", theirs: "#4F9BE8", knot: AMBER, shine: WHITE, string: "#6C5848", band: "#AAB6C4" },
  signals: {
    plate: "#FFF8E8", bell: "#FFC846", band: AMBER, clapper: "#F26B5E", rays: ["#FFC846", AMBER], shine: WHITE,
    bird: "#4F9BE8", wing: "#A9DFE8", beak: AMBER, moon: "#B8ACF5", crater: "#6356B8", leaf: "#55B987",
  },
  effects: { confetti: ["#FFCF3F", "#F26B5E", "#4F9BE8", "#55B987", "#B8ACF5"], dust: CREAM, spark: AMBER, ring: WHITE, swoosh: WHITE },
  gift: { box: "#F39A45", lid: "#F26B5E", ribbon: "#FFE584", ink: INK },
};

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) {
    const art = { ...ART, sceneries: softStage(SCENERIES, { dark: ui.dark }), rim: ui.rim };
    made.set(key, freeze({ font: FONT, stroke: { hair: 2, thin: 2.5, base: 3, bold: 4 }, ui, art }));
  }
  return made.get(key);
}

export const THEME = themeFor(null);
