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

const PLACES = {
  pond: { water: "#62B5B0", wave: "#3D9BC5", lily: "#76B968", vein: "#418D82", reed: "#4E9F58" },
  pool: { water: "#62CDE2", wave: "#9DE5ED", edge: "#EAF5F5", float: "#F26B5E", floatAlt: "#FFF7DF" },
  cloud: { water: "#BEE8F0", wave: "#82C6DB", cloud: "#FFFDF5", shade: "#DCECF0" },
};

const PLATFORM = {
  top: "#F5D68A", side: "#D7A85F", edge: "#FFF1C7",
  ice: "#A9E4ED", iceLight: "#E5FAF8", iceEdge: "#278FA9",
  rubber: "#F27C70", rubberLight: "#FFB49B", pad: "#FFE8AD", padEdge: "#F5E7C6",
};

const ART = {
  ink: INK,
  white: WHITE,
  rings: {
    coral: { body: "#F26B5E", stripe: "#F5E7C6" },
    aqua: { body: "#4BC6D7", stripe: "#FFFDF5" },
    lilac: { body: "#8D7DE8", stripe: "#FFE584" },
    sunny: { body: "#FFCF3F", stripe: "#F26B5E" },
  },
  arrow: { mine: "#FFCF3F", theirs: "#8D7DE8", tip: "#FFF7DF" },
  bar: { body: "#F26B5E", hub: "#FFCF3F" },
  shell: { body: "#FFE0B2", shade: "#EBA984" },
  effects: {
    star: "#FF9E45", starLight: "#FFE584", splash: "#9DE5ED", burst: "#FFCF3F", burstAlt: "#FF9E45",
    confetti: ["#FFCF3F", "#F26B5E", "#4BC6D7", "#8D7DE8", "#55B987"],
    hand: "#F5E7C6", cuff: "#4BC6D7", umbrella: "#F26B5E", shadow: INK,
  },
  gift: { box: "#B8ACF5", lid: "#8D7DE8", ribbon: "#FFCF3F", ink: INK },
};

function artFor(ui) {
  return { ...ART, places: softStage(PLACES, { dark: ui.dark }), platform: softStage(PLATFORM, { dark: ui.dark }), rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 2, thin: 2.5, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
