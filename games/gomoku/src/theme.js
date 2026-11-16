import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  board: { wood: "#D9A86C", grain: "#9B6747", line: "#725038" },
  pieces: [
    { body: "#263042", shine: "#536076", mark: "#FFE584", sign: "diamond" },
    { body: "#FFF9E9", shine: "#FFFDF5", mark: "#9B6747", sign: "ring" },
  ],
  marks: { last: "#FF6B54", target: "#4BC6D7", gold: "#FFCF3F", spark: "#FFE584", white: "#FFFDF5", miss: "#F26B5E" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
