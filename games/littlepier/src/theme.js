import { FONT } from "../../../kit/src/canvas/bar.js";
import { themeFromTokens } from "../../../kit/src/canvas/theme.js";
import { mixColours, softDay, softStage } from "../../../kit/src/canvas/tone.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";
const CREAM = "#FFF7DF";
const STAR = "#FFCF3F";
const CORAL = "#F26B5E";

const CREATURES = [
  "#F39A45", "#4BC6D7", "#FFCF3F", "#F49CB3", "#F26B5E", "#55B987",
  "#B8ACF5", "#4F9BE8", "#F49CB3", "#F39A45", "#F5E7C6", "#FFCF3F",
  "#4F9BE8", "#9BDB9D", "#F26B5E", "#4BC6D7", "#4F9BE8", "#AAB6C4",
  "#F26B5E", "#F39A45", "#B8ACF5", "#F49CB3", "#55B987", "#FFCF3F",
];

const DAYS = {
  morning: { sky: "#BEE8F0", water: "#55BED0", deep: "#318FAE", sun: "#FFE584", sand: "#EBCB83", sandDark: "#D3A75D", leaf: "#4E9F58", band: "rgba(255, 253, 245, 0.16)", cloud: "#FFFDF5", foam: CREAM },
  sunset: { sky: "#F9B49A", water: "#778FC4", deep: "#515F9C", sun: "#F26B5E", sand: "#EBCB83", sandDark: "#D3A75D", leaf: "#4E9F58", band: "rgba(255, 253, 245, 0.16)", cloud: "#FFFDF5", foam: CREAM },
  night: { sky: "#303B59", water: "#345577", deep: "#263C5E", sun: CREAM, sand: "#D3A75D", sandDark: "#B98E4E", leaf: "#4E9F58", band: "rgba(169, 244, 230, 0.09)", cloud: "#FFFDF5", foam: CREAM },
};

const ART = freeze({
  ink: INK,
  white: "#FFFDF5",
  creatures: CREATURES,
  glow: "#A9F4E6",
  detail: { cream: CREAM, redDark: "#C95755", aquaLight: "#A9F4E6", greenLight: "#9BDB9D", green: "#55B987", orange: "#F39A45", shell: "#F5E7C6", woodDark: "#86583F", purple: "#6356B8", silver: "#AAB6C4" },
  hook: { metal: "#AAB6C4", line: CREAM, flick: "#B8ACF5" },
  charms: { star: STAR, heart: CORAL, flower: "#B8ACF5", flowerHeart: STAR },
  bucket: { body: CORAL, rim: CREAM, water: "#4BC6D7" },
  finds: { boot: "#596575", bootTop: "#AAB6C4", stripe: CREAM, chest: "#9B6747", lid: "#DBA66F", lock: STAR, band: "#86583F", glass: "#A9DFE8", cork: "#DBA66F", paper: CREAM, picture: CORAL },
  splash: { drop: "#A9F4E6", ring: CREAM },
  star: STAR,
  bubble: "rgba(255, 253, 245, 0.45)",
  body: { belt: CREAM, rod: "#B87950" },
  window: { sky: "#BEE8F0", sun: "#FFE584", hill: "#9BDB9D", tree: "#4E9F58", frame: CREAM, eye: "#FFFDF5", iris: "#4BC6D7" },
  present: { box: "#B8ACF5", lid: "#8D7DE8", ribbon: STAR, ink: INK },
});

const STAGE = { days: DAYS, pier: { wood: "#B87950", woodLight: "#DBA66F", woodDark: "#86583F" }, boat: { hull: CORAL, rim: CREAM, stripe: "#C95755" } };

function artFor(ui) {
  const mode = { dark: ui.dark };
  const deeper = { ...mode, deeper: 0.06 };
  const pier = Object.fromEntries(Object.entries(STAGE.pier).map(([key, colour]) => [key, softDay(colour, deeper)]));
  return { ...ART, days: softStage(STAGE.days, mode), pier, boat: softStage(STAGE.boat, mode), rim: ui.rim, silhouette: mixColours(ui.muted, ui.surface, 0.42) };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
