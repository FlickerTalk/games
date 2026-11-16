import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  board: { light: "#F0D39E", dark: "#AE774E", frame: "#79503B", grain: "#C99768" },
  pieces: [
    { body: "#8D7DE8", top: "#B8ACF5", mark: "ring" },
    { body: "#FFCF3F", top: "#FFE584", mark: "diamond" },
  ],
  marks: { white: "#FFFDF5", cream: "#FFF7DF", peg: "#FFCF3F", alert: "#FF9E45", crown: "#FFC846" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
