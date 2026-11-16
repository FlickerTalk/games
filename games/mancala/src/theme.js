import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)])));
  return value;
}

export const ART = freeze({
  ink: "#243247",
  board: { wood: "#A97045", edge: "#74462F", hollow: "#65432F", deep: "#4E3428", detail: "#D89A62" },
  seeds: { body: "#F5E7C6", light: "#FFF6DB" },
  pieces: [
    { body: "#FFCF3F", light: "#FFE584", mark: "ring" },
    { body: "#8D7DE8", light: "#B8ACF5", mark: "diamond" },
  ],
  marks: { white: "#FFFDF5", cream: "#FFF7DF", star: "#FF9E45" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
