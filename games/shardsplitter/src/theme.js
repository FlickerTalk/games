import { FONT, softDay, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";
const CRYSTAL = "#65D8E4";
const CRYSTAL_LIGHT = "#C6F7F2";
const VIOLET = "#A99AF2";
const ROSE = "#F3A7C5";
const GOLD = "#FFC846";
const WOOD_LIGHT = "#E6B56E";

const ART = freeze({
  ink: INK,
  white: "#FFFDF5",
  cream: "#FFF6DB",
  shadow: "#9C8B78",
  crystal: { body: CRYSTAL_LIGHT, facet: CRYSTAL, facetAlt: VIOLET, deep: "#3A9AB8", edge: "#32708E", belly: "#FFF6DB", shine: CRYSTAL_LIGHT },
  tongue: "#F47F91",
  caps: ["#F39A45", "#8D7DE8", "#55B987"],
  mallet: { wood: "#B97845", light: WOOD_LIGHT, dark: "#805036" },
  jar: { glass: CRYSTAL_LIGHT, fill: CRYSTAL, lid: "#D9E3E6", shine: "#FFFDF5", star: "#FF9E45" },
  bell: "#FFD879",
  miss: "#AAB6C4",
  burst: { star: "#FF9E45", bits: [CRYSTAL, GOLD, ROSE] },
  confetti: ["#FFCF3F", "#FF6B54", "#55B987", CRYSTAL, "#8D7DE8"],
  present: { box: "#F26B5E", lid: "#FFCF3F", ribbon: "#FFCF3F", ink: INK },
});

const PLACES = freeze({
  workshop: { sky: "#BEE8F0", wall: "#F5E7C6", ground: "#E5C68F", speck: "#B68B68", light: "#FFF6DB", mid: "#D3B889", stick: "#805036", gemA: CRYSTAL, gemB: VIOLET, gemC: ROSE },
  ice: { sky: "#415978", wall: "#6685B5", ground: "#DDF5F6", speck: "#9EDDE7", light: "#DDF5F6", mid: "#9EDDE7", stick: "#5E9FC2", gemA: CRYSTAL, gemB: VIOLET, gemC: "#DDF5F6" },
  candy: { sky: "#C884B5", wall: "#F7C6D4", ground: "#DDA66D", speck: "#B68B68", light: "#FFE4E9", mid: "#9FE2C1", stick: WOOD_LIGHT, gemA: "#FFE4E9", gemB: "#9FE2C1", gemC: ROSE },
});

const GROUND = ["ground", "speck"];

function placeFor(look, mode) {
  return Object.fromEntries(Object.entries(look).map(([key, colour]) => [key, softDay(colour, GROUND.includes(key) ? { ...mode, deeper: 0.1 } : mode)]));
}

function artFor(ui) {
  const mode = { dark: ui.dark };
  const places = Object.fromEntries(Object.entries(PLACES).map(([name, look]) => [name, placeFor(look, mode)]));
  return { ...ART, places, rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, text: { digit: 20, chip: 22 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
