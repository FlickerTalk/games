import { FONT, softDay, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const INK = "#243247";
const GIFT = "#F26B5E";
const RIBBON = "#FFE584";

const ART = freeze({
  ink: INK,
  white: "#FFFDF5",
  cream: "#FFF7DF",
  dust: "#E8DCC2",
  robots: {
    box: { body: "#FFCF3F", light: "#FFE584" },
    capsule: { body: "#8D7DE8", light: "#B8ACF5" },
    wide: { body: "#FF6B54", light: "#FFB3A6" },
    cone: { body: "#55B987", light: "#A6DDBF" },
    ball: { body: "#4F9BE8", light: "#A9CDF4" },
    star: { body: "#FF9E45", light: "#FFCF9E" },
  },
  robot: { visor: "#263858", eye: "#A9F4E6", feet: "#69788B", antenna: "#FF6B54", nose: "#FFF7DF" },
  puddle: { water: "#3D9BC5", light: "#9DE5ED" },
  battery: { body: "#55B987", cap: "#AAB6C4", bolt: "#FFE584" },
  goal: { ring: "#FFE584", inner: "#FFF7DF", edge: "#FF9E45", star: "#FFC846" },
  door: { post: "#AAB6C4", shut: "#FF6B54", open: "#55B987", knob: "#FFF7DF" },
  running: "#FFE584",
  wrong: "#FF6B54",
  loop: { ring: "#348663", badge: "#55B987", digit: "#FFFDF5" },
  burst: { ray: "#FF9E45", rayAlt: "#FFCF3F", star: "#FFC846" },
  confetti: ["#FFCF3F", "#FF6B54", "#55B987", "#4F9BE8", "#8D7DE8"],
  present: { box: GIFT, lid: RIBBON, ribbon: RIBBON, ink: INK },
});

const WORLDS = freeze({
  workshop: { background: "#E8DFC8", floor: "#F6EEDC", line: "#D2C5A9", wall: "#AAB6C4", wallTop: "#FFF7DF", deco: "#D2C5A9", leaf: "#AAB6C4", spark: "#FFE584" },
  garden: { background: "#B8E184", floor: "#E5F2C5", line: "#4E9F58", wall: "#4E9F58", wallTop: "#6DBC60", deco: "#4E9F58", leaf: "#B8E184", spark: "#FFCF3F" },
  space: { background: "#303B59", floor: "#45516C", line: "#6D7892", wall: "#69788B", wallTop: "#AAB6C4", deco: "#6D7892", leaf: "#AAB6C4", spark: "#FFE584" },
});

const GROUND = ["floor", "line"];

function worldFor(look, mode) {
  return Object.fromEntries(Object.entries(look).map(([key, colour]) => [key, softDay(colour, GROUND.includes(key) ? { ...mode, deeper: 0.12 } : mode)]));
}

function artFor(ui) {
  const mode = { dark: ui.dark };
  const worlds = Object.fromEntries(Object.entries(WORLDS).map(([name, look]) => [name, worldFor(look, mode)]));
  return { ...ART, worlds, rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { hair: 1.5, thin: 2, base: 3, bold: 4 }, text: { digit: 22 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);
