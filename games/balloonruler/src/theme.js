import { FONT } from "../../../kit/src/canvas/bar.js";
import { themeFromTokens } from "../../../kit/src/canvas/theme.js";
import { readableOn, softDay, softStage } from "../../../kit/src/canvas/tone.js";

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
const SUN = "#FFE584";
const YELLOW = "#FFCF3F";
const CORAL = "#F26B5E";
const BLUE = "#4F9BE8";
const MINT = "#55B987";
const ORANGE = "#F39A45";
const PINK = "#ED8FB5";
const LILAC = "#A995EB";
const VIOLET = "#8D7DE8";
const WOOD = "#9B6747";

const ART = freeze({
  ink: INK,
  white: WHITE,
  balloons: [CORAL, BLUE, MINT, ORANGE, PINK, LILAC],
  thread: { short: MINT, medium: ORANGE, long: VIOLET },
  marker: { mine: YELLOW, rival: VIOLET, ghost: "#B8C9D6", ghostEdge: "#6356B8", glow: SUN, star: "#FF9E45" },
  arrow: { shaft: WOOD, feather: SUN, rivalFeather: "#B8ACF5", suction: "#FF6B54", suctionDark: "#E45145", cork: "#C88B57", corkLine: SUN, petal: PINK, heart: YELLOW, bow: WOOD, string: CREAM },
  card: { dot: BLUE, bar: MINT },
  body: { belt: CREAM },
  present: { box: "#B8ACF5", lid: VIOLET, ribbon: YELLOW, ink: INK },
});

const PLACES = {
  meadow: { sky: "#BEE8F0", sun: SUN, cloud: WHITE, cloudShade: "#DCECF0", hill: "#B8E184", ground: "#83C96B", tree: "#3D8E56", treeLight: "#6DBC60", trunk: WOOD },
  mountain: { sky: "#BEE8F0", cloud: WHITE, far: "#BCD4DA", near: "#8AA6B8", snow: "#F4F7EC", ground: "#4E9F58" },
  clouds: { sky: "#80CBE2", sun: SUN, cloud: WHITE, cloudShade: "#DCECF0" },
};

const RULER = { wood: "#F7D98B", edge: "#D9AC58" };

function artFor(ui) {
  const mode = { dark: ui.dark };
  const wood = softDay(RULER.wood, { ...mode, deeper: 0.04 });
  const ruler = { wood, edge: softDay(RULER.edge, { ...mode, deeper: 0.04 }), mark: readableOn(INK, wood, 4.5) };
  return { ...ART, places: softStage(PLACES, mode), ruler, rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
