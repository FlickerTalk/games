import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)])));
  return value;
}

export const ART = freeze({
  ink: "#243247",
  board: { face: "#EBCB83", base: "#9B6747" },
  tiles: {
    g: { face: "#55B987", detail: "#318264", letter: "#243247", sign: "star" },
    y: { face: "#FFCF3F", detail: "#D9932E", letter: "#243247", sign: "diamond" },
    b: { face: "#7C899B", detail: "#596575", letter: "#FFFDF5", sign: "dash" },
  },
  sides: [
    { body: "#FFCF3F", deep: "#E89A2D", mark: "star" },
    { body: "#8D7DE8", deep: "#6356B8", mark: "bars" },
  ],
  marks: { white: "#FFFDF5" },
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
