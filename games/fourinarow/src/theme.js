import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)])));
  return value;
}

export const ART = freeze({
  ink: "#243247",
  board: { wood: "#D89A54", rail: "#F2C979", edge: "#A9603C", hole: "#FFF3D2" },
  pieces: [
    { body: "#FFCF3F", light: "#FFE584", deep: "#E89A2D", mark: "cross" },
    { body: "#8D7DE8", light: "#B8ACF5", deep: "#6356B8", mark: "ring" },
  ],
  marks: { white: "#FFFDF5" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
