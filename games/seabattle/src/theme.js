import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Array.isArray(value) ? value.map(freeze) : Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  board: { water: "#55B9D1", line: "#9DE5ED", edge: "#C8E0E5" },
  boats: [
    { body: "#FFCF3F", light: "#FFE584", dark: "#E89A2D", mark: "flag" },
    { body: "#8D7DE8", light: "#B8ACF5", dark: "#6356B8", mark: "funnel" },
  ],
  marks: { white: "#FFFDF5", paint: "#F26B5E", miss: "#D9F4F2", foam: "#E8FAF7", flag: "#FF6B54", glass: "#A9DFE8", star: "#FF9E45", gold: "#FFC846" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
