import { duskBoard, tabletopTheme } from "../../../kit/src/tabletop/theme.js";

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)])));
  return value;
}

export const ART = freeze({
  ink: "#243247",
  board: { frame: "#415568", cell: "#334555" },
  grid: { line: "#FFF6DB" },
  pieces: [
    { body: "#FFF6DB", hue: "#FFCF3F", ring: "#E89A2D", dot: "#FFCF3F" },
    { body: "#8FDEE7", hue: "#8D7DE8", ring: "#B8ACF5", dot: "#B8ACF5" },
  ],
  marks: { white: "#FFFDF5", cream: "#FFF7DF", diamond: "#FFC846", miss: "#FF6B54" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) {
    const base = tabletopTheme(tokens, { dark }, ART);
    made.set(key, Object.freeze({ ...base, grid: duskBoard(ART.grid, { dark: base.dark }) }));
  }
  return made.get(key);
}
