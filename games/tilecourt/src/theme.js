import { FONT, softDay, softStage, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";
const COURT = ["stone", "stoneLight", "stoneDark", "edge", "grout", "bed"];

const ART = freeze({
  ink: INK,
  white: "#FFFDF5",
  tiles: [
    { fill: "#35B8AE", mark: "#C0F0DD" },
    { fill: "#F26B5E", mark: "#FFE0B5" },
    { fill: "#E9B93F", mark: "#7167C9" },
    { fill: "#7167C9", mark: "#D8CBF2" },
  ],
  stone: "#E7DCC8",
  stoneLight: "#F4EBDD",
  stoneDark: "#C8BBA6",
  edge: "#D4C5AE",
  grout: "#B6A891",
  bed: "#C97B5A",
  valid: "#79CDB7",
  invalid: "#E88672",
  glow: "#FFF0A6",
  glowSoft: "rgba(255, 240, 166, 0.4)",
  shadow: "rgba(36, 50, 71, 0.2)",
  scenery: {
    patio: { ground: "#EBD8B8", wall: "#F3D8B5", pot: "#C97B5A", leaf: "#4F9271", leafLight: "#91BE82", fruit: "#ED9B40", water: "#4CA7C2", waterLight: "#A9E2E4", stone: "#F4EBDD", stoneDark: "#C8BBA6" },
    rooftop: { ground: "#B78FA5", sky: "#7C7896", roof: "#B78FA5", block: "#4C5877", bulb: "#FFB15C", bulbLight: "#FFF1CE" },
    greenhouse: { ground: "#C5DCCB", glass: "#DDF0E7", frame: "#4F9271", pot: "#C97B5A", leaf: "#4F9271", leafLight: "#91BE82" },
    seaside: { ground: "#BDE4E2", sea: "#76BED0", wave: "#BDE4E2", deck: "#F4EBDD", rail: "#FFFDF5" },
    night: { ground: "#4C5877", sky: "#303B59", star: "#FFF1CE", starBright: "#FFF0A6", moon: "#FFF1CE" },
  },
  effects: {
    lantern: "#FFB15C",
    paper: "#FFF1CE",
    leaf: "#91BE82",
    water: "#4CA7C2",
    waterLight: "#A9E2E4",
    bubble: "rgba(255, 253, 245, 0.5)",
    spark: "#FFC846",
    sparkRay: "#FFF0A6",
    gift: "#B78FA5",
    giftLid: "#C9A3B8",
    ribbon: "#FFF0A6",
    confetti: ["#35B8AE", "#F26B5E", "#E9B93F", "#7167C9", "#FFFDF5"],
  },
});

function artFor(ui) {
  const mode = { dark: ui.dark };
  const court = Object.fromEntries(COURT.map((key) => [key, softDay(ART[key], { ...mode, deeper: 0.12 })]));
  const { gift, giftLid, ribbon } = ART.effects;
  return { ...ART, ...court, scenery: softStage(ART.scenery, mode), rim: ui.rim, present: { box: gift, lid: giftLid, ribbon, ink: INK } };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, text: { burst: 28 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
